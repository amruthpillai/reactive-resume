import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import { lookup } from "node:dns/promises";
import * as http from "node:http";
import * as https from "node:https";
import { isIP } from "node:net";
import { ORPCError } from "@orpc/client";
import { generateText } from "ai";
import z from "zod";
import { generateId, slugify } from "@reactive-resume/utils/string";
import { protectedProcedure } from "../../context";
import { aiRequestRateLimit } from "../../middleware/rate-limit";
import { getModel } from "../ai/service";
import { aiProvidersService } from "../ai-providers/service";
import { resumeService } from "../resume/service";
import { applicationService } from "./service";

const reserved = { tags: ["Applications", "AI"] } as const;
const MAX_JOB_POSTING_BYTES = 200_000;
const MAX_PASTED_JOB_DESCRIPTION_CHARS = 20_000;
const JOB_POSTING_CONTENT_TYPES = ["text/html", "text/plain", "application/xhtml+xml", "application/xml", "text/xml"];
const LINKEDIN_JOB_POSTING_URL = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting";
const LINKEDIN_FETCH_RETRIES = 3;
type ValidatedAddress = { address: string; family: 4 | 6 };

type LinkedInJobPosting = {
	title: string;
	company: string | null;
	location: string | null;
	description: string | null;
	seniority: string | null;
	employmentType: string | null;
	jobFunction: string | null;
	industries: string | null;
};

// Resolve the user's default (tested + enabled) AI provider into a ready model instance.
async function resolveModel(userId: string) {
	const provider = await aiProvidersService.getDefaultRunnable({ userId });
	if (!provider) {
		throw new ORPCError("BAD_REQUEST", {
			message: "No AI provider is configured. Add one in Settings → Integrations to use AI features.",
		});
	}
	return getModel({
		provider: provider.provider,
		model: provider.model,
		apiKey: provider.apiKey,
		...(provider.baseURL ? { baseURL: provider.baseURL } : {}),
	});
}

// generateText + tolerant JSON extraction + Zod validation. Mirrors the resume-analysis pattern
// (the SDK's generateObject isn't wired for every provider here, so we parse defensively).
async function generateJson<T>(model: Awaited<ReturnType<typeof resolveModel>>, prompt: string, schema: z.ZodType<T>) {
	const { text } = await generateText({ model, messages: [{ role: "user", content: prompt }] });
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
	const candidate = fenced?.[1] ?? text;
	const start = candidate.indexOf("{");
	const end = candidate.lastIndexOf("}");
	if (start === -1 || end === -1 || end < start) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "The AI response could not be parsed." });
	}
	return schema.parse(JSON.parse(candidate.slice(start, end + 1)));
}

async function generatePlainText(model: Awaited<ReturnType<typeof resolveModel>>, prompt: string) {
	const { text } = await generateText({ model, messages: [{ role: "user", content: prompt }] });
	return text.trim();
}

function isPrivateIPv4(address: string) {
	const parts = address.split(".").map((part) => Number(part));
	if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
	const [a = 0, b = 0] = parts;
	return (
		a === 0 ||
		a === 10 ||
		a === 127 ||
		(a === 100 && b >= 64 && b <= 127) ||
		(a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 168) ||
		a >= 224
	);
}

function isPrivateAddress(address: string) {
	if (address.startsWith("::ffff:")) return isPrivateIPv4(address.slice(7));
	if (isIP(address) === 4) return isPrivateIPv4(address);

	const normalized = address.toLowerCase();
	return (
		normalized === "::1" ||
		normalized === "::" ||
		normalized.startsWith("fc") ||
		normalized.startsWith("fd") ||
		normalized.startsWith("fe8") ||
		normalized.startsWith("fe9") ||
		normalized.startsWith("fea") ||
		normalized.startsWith("feb")
	);
}

async function assertPublicHttpUrl(url: string): Promise<{ parsed: URL; address: ValidatedAddress }> {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new ORPCError("BAD_REQUEST", { message: "The job posting URL is invalid." });
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new ORPCError("BAD_REQUEST", { message: "Only http(s) job posting URLs are supported." });
	}
	if (parsed.hostname.toLowerCase() === "localhost") {
		throw new ORPCError("BAD_REQUEST", { message: "Local job posting URLs are not supported." });
	}

	const addresses = isIP(parsed.hostname)
		? [{ address: parsed.hostname, family: isIP(parsed.hostname) as 4 | 6 }]
		: ((await lookup(parsed.hostname, { all: true, verbatim: true })) as ValidatedAddress[]);
	if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
		throw new ORPCError("BAD_REQUEST", { message: "Private or local job posting URLs are not supported." });
	}

	const [address] = addresses;
	if (!address) throw new ORPCError("BAD_REQUEST", { message: "The job posting URL could not be resolved." });
	return { parsed, address };
}

function headerValue(headers: IncomingHttpHeaders, name: string) {
	const value = headers[name];
	return Array.isArray(value) ? value[0] : value;
}

async function readTextResponse(response: IncomingMessage) {
	const contentType = headerValue(response.headers, "content-type")?.split(";")[0]?.trim().toLowerCase();
	if (contentType && !JOB_POSTING_CONTENT_TYPES.includes(contentType)) {
		throw new ORPCError("BAD_REQUEST", { message: "The job posting URL did not return a text page." });
	}

	const contentLength = Number(headerValue(response.headers, "content-length"));
	if (Number.isFinite(contentLength) && contentLength > MAX_JOB_POSTING_BYTES) {
		throw new ORPCError("BAD_REQUEST", {
			message: "The job posting page is too large. Paste the description instead.",
		});
	}

	const chunks: Uint8Array[] = [];
	let total = 0;

	for await (const value of response) {
		const chunk = typeof value === "string" ? Buffer.from(value) : value;
		total += chunk.byteLength;
		if (total > MAX_JOB_POSTING_BYTES) {
			response.destroy();
			throw new ORPCError("BAD_REQUEST", {
				message: "The job posting page is too large. Paste the description instead.",
			});
		}
		chunks.push(chunk);
	}

	return new TextDecoder().decode(Buffer.concat(chunks));
}

function requestJobPosting(parsed: URL, address: ValidatedAddress, signal: AbortSignal) {
	return new Promise<IncomingMessage>((resolve, reject) => {
		const client = parsed.protocol === "https:" ? https : http;
		const request = client.request(
			parsed,
			{
				signal,
				headers: {
					"user-agent":
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
					accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
					"accept-language": "en-US,en;q=0.9",
				},
				lookup: (_hostname, options, callback) => {
					if (options.all) {
						callback(null, [address]);
						return;
					}

					callback(null, address.address, address.family);
				},
			},
			resolve,
		);
		request.on("error", reject);
		request.end();
	});
}

function decodeLinkedInHtml(text: string) {
	const numericEntity = (value: string, radix: number) => {
		const codePoint = Number.parseInt(value, radix);
		return codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : "";
	};

	return text
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ")
		.replace(/&#(\d+);/g, (_match, decimal: string) => numericEntity(decimal, 10))
		.replace(/&#[xX]([0-9a-fA-F]+);/g, (_match, hexadecimal: string) => numericEntity(hexadecimal, 16))
		.replace(/&amp;/g, "&");
}

function cleanLinkedInHtml(html: string) {
	return decodeLinkedInHtml(
		html
			.replace(/<[^>]+>/g, " ")
			.replace(/\s+/g, " ")
			.trim(),
	);
}

function linkedInJobId(url: string) {
	try {
		const parsed = new URL(url);
		const hostname = parsed.hostname.toLowerCase();
		if (hostname !== "linkedin.com" && !hostname.endsWith(".linkedin.com")) return null;

		const slug = parsed.pathname.split("/").filter(Boolean).at(-1) ?? "";
		return slug.match(/(?:^|-)(\d{6,})$/)?.[1] ?? null;
	} catch {
		return null;
	}
}

function isLinkedInUrl(url: string) {
	try {
		const hostname = new URL(url).hostname.toLowerCase();
		return hostname === "linkedin.com" || hostname.endsWith(".linkedin.com");
	} catch {
		return false;
	}
}

function parseLinkedInJobPosting(html: string): LinkedInJobPosting {
	const title = html.match(/class="(?:top-card-layout__title|topcard__title)[^"]*"[^>]*>([\s\S]*?)<\/h[12]>/i)?.[1];
	const organization = html.match(/class="topcard__org-name-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i)?.[1];
	const location = html.match(/class="topcard__flavor topcard__flavor--bullet"[^>]*>([\s\S]*?)<\/span>/i)?.[1];
	const description = html.match(
		/class="(?:show-more-less-html__markup|description__text[^"]*)"[^>]*>([\s\S]*?)<\/div>/i,
	)?.[1];
	const criteria: Record<string, string> = {};
	const criteriaPattern =
		/class="description__job-criteria-subheader"[^>]*>([\s\S]*?)<\/h3>[\s\S]*?class="description__job-criteria-text[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;

	for (const match of html.matchAll(criteriaPattern)) {
		const [label, value] = [match[1], match[2]];
		if (!label || !value) continue;
		criteria[cleanLinkedInHtml(label).toLowerCase()] = cleanLinkedInHtml(value);
	}

	return {
		title: title ? cleanLinkedInHtml(title) : "",
		company: organization ? cleanLinkedInHtml(organization) || null : null,
		location: location ? cleanLinkedInHtml(location) || null : null,
		description: description
			? decodeLinkedInHtml(
					description
						.replace(/<\s*br\s*\/?>/gi, "\n")
						.replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
						.replace(/<[^>]+>/g, " "),
				)
					.replace(/[ \t]+\n/g, "\n")
					.replace(/\n{3,}/g, "\n\n")
					.trim() || null
			: null,
		seniority: criteria["seniority level"] ?? null,
		employmentType: criteria["employment type"] ?? null,
		jobFunction: criteria["job function"] ?? null,
		industries: criteria.industries ?? null,
	};
}

function linkedInPostingText(posting: LinkedInJobPosting) {
	return [
		posting.title,
		posting.company ? `Company: ${posting.company}` : "",
		posting.location ? `Location: ${posting.location}` : "",
		posting.seniority ? `Seniority: ${posting.seniority}` : "",
		posting.employmentType ? `Employment type: ${posting.employmentType}` : "",
		posting.jobFunction ? `Job function: ${posting.jobFunction}` : "",
		posting.industries ? `Industries: ${posting.industries}` : "",
		posting.description ?? "",
	]
		.filter(Boolean)
		.join("\n\n")
		.slice(0, 8_000);
}

async function fetchLinkedInJobPostingText(jobId: string): Promise<string> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 10_000);
	try {
		for (let attempt = 0; attempt <= LINKEDIN_FETCH_RETRIES; attempt++) {
			const response = await new Promise<IncomingMessage>((resolve, reject) => {
				const request = https.request(
					new URL(`${LINKEDIN_JOB_POSTING_URL}/${jobId}`),
					{
						signal: controller.signal,
						headers: {
							"user-agent":
								"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
							accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
							"accept-language": "en-US,en;q=0.9",
							"x-requested-with": "XMLHttpRequest",
						},
					},
					resolve,
				);
				request.on("error", reject);
				request.end();
			});

			if (response.statusCode === 429 || (response.statusCode && response.statusCode >= 500)) {
				response.resume();
				if (attempt === LINKEDIN_FETCH_RETRIES) {
					throw new ORPCError("BAD_REQUEST", { message: "LinkedIn is temporarily unavailable. Try again later." });
				}
				await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
				continue;
			}
			if (response.statusCode === 404) {
				throw new ORPCError("BAD_REQUEST", { message: "The LinkedIn job posting was not found." });
			}
			if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
				throw new ORPCError("BAD_REQUEST", { message: "Couldn't fetch the LinkedIn job posting." });
			}

			const posting = parseLinkedInJobPosting(await readTextResponse(response));
			const text = linkedInPostingText(posting);
			if (!text) throw new ORPCError("BAD_REQUEST", { message: "Couldn't read the LinkedIn job posting." });
			return text;
		}
		throw new ORPCError("BAD_REQUEST", { message: "LinkedIn is temporarily unavailable. Try again later." });
	} finally {
		clearTimeout(timeout);
	}
}

// Best-effort fetch + strip of a job posting page. http(s) only, size/time capped.
export async function fetchJobPostingText(url: string): Promise<string> {
	const jobId = linkedInJobId(url);
	if (jobId) return fetchLinkedInJobPostingText(jobId);
	if (isLinkedInUrl(url)) {
		throw new ORPCError("BAD_REQUEST", { message: "The LinkedIn job URL must include a job posting ID." });
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 10_000);
	try {
		const { parsed, address } = await assertPublicHttpUrl(url);
		const response = await requestJobPosting(parsed, address, controller.signal);
		if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
			throw new ORPCError("BAD_REQUEST", { message: "Redirecting job posting URLs are not supported." });
		}
		if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Couldn't fetch the posting (HTTP ${response.statusCode ?? "unknown"}).`,
			});
		}
		const html = await readTextResponse(response);
		return html
			.replace(/<script[\s\S]*?<\/script>/gi, " ")
			.replace(/<style[\s\S]*?<\/style>/gi, " ")
			.replace(/<[^>]+>/g, " ")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 8_000);
	} catch (error) {
		if (error instanceof ORPCError) throw error;
		throw new ORPCError("BAD_REQUEST", { message: "Couldn't read the job posting. Paste the description instead." });
	} finally {
		clearTimeout(timeout);
	}
}

const autofillOutput = z.object({
	company: z.string(),
	role: z.string(),
	location: z.string(),
	salary: z.string(),
	jobDescription: z.string(),
});

export const autofillInputSchema = z.object({
	sourceUrl: z.string().optional(),
	jobDescription: z.string().max(MAX_PASTED_JOB_DESCRIPTION_CHARS).optional(),
});

// Tolerant of LLM variance: clamp the score, cap the lists by slicing rather than rejecting.
const matchScoreOutput = z.object({
	score: z.coerce
		.number()
		.catch(0)
		.transform((n) => Math.max(0, Math.min(100, Math.round(n)))),
	gaps: z
		.array(z.string())
		.catch([])
		.transform((a) => a.slice(0, 8)),
	strengths: z
		.array(z.string())
		.catch([])
		.transform((a) => a.slice(0, 8)),
});

export const aiRouter = {
	// Extract structured fields from a pasted job description or a posting URL.
	autofill: protectedProcedure
		.route({ method: "POST", path: "/applications/ai/autofill", operationId: "aiAutofillApplication", ...reserved })
		.input(autofillInputSchema)
		.use(aiRequestRateLimit)
		.output(autofillOutput)
		.handler(async ({ context, input }) => {
			const model = await resolveModel(context.user.id);
			const posting =
				input.jobDescription?.trim() || (input.sourceUrl ? await fetchJobPostingText(input.sourceUrl) : "");
			if (!posting) {
				throw new ORPCError("BAD_REQUEST", { message: "Provide a job posting URL or paste the description." });
			}

			return generateJson(
				model,
				`Extract the following fields from this job posting. Return ONLY JSON with keys company, role, location, salary, jobDescription. Use an empty string for anything not stated. "jobDescription" should be a concise 1–2 paragraph plain-text summary of the responsibilities and requirements.\n\nJOB POSTING:\n${posting}`,
				autofillOutput,
			);
		}),

	// Score the linked resume against the application's job description.
	matchScore: protectedProcedure
		.route({
			method: "POST",
			path: "/applications/{id}/ai/match-score",
			operationId: "aiApplicationMatchScore",
			...reserved,
		})
		.input(z.object({ id: z.string() }))
		.use(aiRequestRateLimit)
		.output(matchScoreOutput)
		.handler(async ({ context, input }) => {
			const application = await applicationService.getById({ id: input.id, userId: context.user.id });
			if (!application.resumeId)
				throw new ORPCError("BAD_REQUEST", { message: "Link a resume to this application first." });
			if (!application.jobDescription) {
				throw new ORPCError("BAD_REQUEST", { message: "Add a job description (via Auto-fill or Edit) first." });
			}

			const [model, resume] = await Promise.all([
				resolveModel(context.user.id),
				resumeService.getById({ id: application.resumeId, userId: context.user.id }),
			]);

			const result = await generateJson(
				model,
				`Compare this resume against the job description. Return ONLY JSON with keys score (integer 0-100 fit), gaps (array of short missing-qualification strings), strengths (array of short matching-strength strings).\n\nRESUME:\n${JSON.stringify(resume.data)}\n\nJOB DESCRIPTION:\n${application.jobDescription}`,
				matchScoreOutput,
			);

			await applicationService.setAiResult({
				id: input.id,
				userId: context.user.id,
				matchScore: result.score,
				aiMetadata: { matchScore: result },
			});

			return result;
		}),

	// Generate a cover letter or recruiter follow-up from the application + resume context.
	draftMessage: protectedProcedure
		.route({
			method: "POST",
			path: "/applications/{id}/ai/draft-message",
			operationId: "aiDraftApplicationMessage",
			...reserved,
		})
		.input(z.object({ id: z.string(), kind: z.enum(["cover-letter", "follow-up"]) }))
		.use(aiRequestRateLimit)
		.output(z.object({ text: z.string() }))
		.handler(async ({ context, input }) => {
			const application = await applicationService.getById({ id: input.id, userId: context.user.id });
			const model = await resolveModel(context.user.id);
			const resume = application.resumeId
				? await resumeService.getById({ id: application.resumeId, userId: context.user.id }).catch(() => null)
				: null;

			const context_ = `ROLE: ${application.role} at ${application.company}${application.location ? ` (${application.location})` : ""}\n${application.jobDescription ? `JOB DESCRIPTION:\n${application.jobDescription}\n` : ""}${resume ? `CANDIDATE RESUME:\n${JSON.stringify(resume.data)}` : ""}`;

			const prompt =
				input.kind === "cover-letter"
					? `Write a concise, specific cover letter (250-350 words, no placeholders like [Name]) for this application, drawing on the resume. Return only the letter text.\n\n${context_}`
					: `Write a short, polite follow-up message (80-120 words) to a recruiter checking in on this application. Warm but not pushy. Return only the message text.\n\n${context_}`;

			return { text: await generatePlainText(model, prompt) };
		}),

	// Create a tailored copy of the linked resume (job-specific summary) and link it to the application.
	tailorResume: protectedProcedure
		.route({
			method: "POST",
			path: "/applications/{id}/ai/tailor-resume",
			operationId: "aiTailorResumeForApplication",
			...reserved,
		})
		.input(z.object({ id: z.string() }))
		.use(aiRequestRateLimit)
		.output(z.object({ resumeId: z.string(), name: z.string() }))
		.handler(async ({ context, input }) => {
			const application = await applicationService.getById({ id: input.id, userId: context.user.id });
			if (!application.resumeId)
				throw new ORPCError("BAD_REQUEST", { message: "Link a resume to this application first." });
			if (!application.jobDescription) {
				throw new ORPCError("BAD_REQUEST", { message: "Add a job description (via Auto-fill or Edit) first." });
			}

			const [model, resume] = await Promise.all([
				resolveModel(context.user.id),
				resumeService.getById({ id: application.resumeId, userId: context.user.id }),
			]);

			const { summary } = await generateJson(
				model,
				`Rewrite this candidate's professional summary to target the job below. Return ONLY JSON { "summary": "<one to two sentence HTML paragraph, e.g. <p>…</p>>" }. Keep it truthful to the resume.\n\nRESUME:\n${JSON.stringify(resume.data)}\n\nJOB:\n${application.role} at ${application.company}\n${application.jobDescription}`,
				z.object({ summary: z.string() }),
			);

			const name = `Tailored — ${application.company} · ${application.role}`.slice(0, 60);
			const tailoredData = { ...resume.data, summary: { ...resume.data.summary, content: summary } };

			const newResumeId = await resumeService.create({
				userId: context.user.id,
				name,
				slug: `${slugify(name)}-${generateId().slice(0, 6)}`,
				tags: [...resume.tags, "tailored"],
				data: tailoredData,
				locale: context.locale,
			});

			// Point the application at the tailored copy and log it on the timeline.
			await applicationService.update({ id: input.id, userId: context.user.id, resumeId: newResumeId });
			await applicationService.addNote({
				id: input.id,
				userId: context.user.id,
				text: `AI tailored a resume: ${name}`,
			});

			return { resumeId: newResumeId, name };
		}),
};
