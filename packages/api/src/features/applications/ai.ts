import { ORPCError } from "@orpc/client";
import { AISDKError, generateText } from "ai";
import z from "zod";
import { generateId, slugify } from "@reactive-resume/utils/string";
import { protectedProcedure } from "../../context";
import { aiRequestRateLimit } from "../../middleware/rate-limit";
import { getModel } from "../ai/service";
import { aiProvidersService } from "../ai-providers/service";
import { resumeService } from "../resume/service";
import { applicationService } from "./service";

const reserved = { tags: ["Applications", "AI"] } as const;
const MAX_PASTED_JOB_DESCRIPTION_CHARS = 20_000;

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

function isAiProviderGatewayError(error: unknown): boolean {
	return error instanceof AISDKError;
}

/** Throws a BAD_GATEWAY ORPCError, preserving the original cause for upstream error reporters. */
function throwAiProviderGatewayError(cause?: unknown): never {
	throw new ORPCError("BAD_GATEWAY", { message: "Could not reach the AI provider.", cause });
}

// generateText + tolerant JSON extraction + Zod validation. Mirrors the resume-analysis pattern
// (the SDK's generateObject isn't wired for every provider here, so we parse defensively).
// Provider failures (bad key, unknown model, quota, 5xx) are translated to BAD_GATEWAY instead of
// bubbling out as an opaque INTERNAL_SERVER_ERROR, matching features/ai/router.ts.
/** Exported for tests: provider-failure translation shared by every copilot procedure. */
export async function generateJson<T>(
	model: Awaited<ReturnType<typeof resolveModel>>,
	prompt: string,
	schema: z.ZodType<T>,
) {
	let text: string;
	try {
		({ text } = await generateText({ model, messages: [{ role: "user", content: prompt }] }));
	} catch (error) {
		if (isAiProviderGatewayError(error)) throwAiProviderGatewayError(error);
		throw error;
	}
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
	const candidate = fenced?.[1] ?? text;
	const start = candidate.indexOf("{");
	const end = candidate.lastIndexOf("}");
	if (start === -1 || end === -1 || end < start) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "The AI response could not be parsed." });
	}
	return schema.parse(JSON.parse(candidate.slice(start, end + 1)));
}

/** Exported for tests: provider-failure translation shared by every copilot procedure. */
export async function generatePlainText(model: Awaited<ReturnType<typeof resolveModel>>, prompt: string) {
	try {
		const { text } = await generateText({ model, messages: [{ role: "user", content: prompt }] });
		return text.trim();
	} catch (error) {
		if (isAiProviderGatewayError(error)) throwAiProviderGatewayError(error);
		throw error;
	}
}

const autofillOutput = z.object({
	company: z.string(),
	role: z.string(),
	location: z.string(),
	salary: z.string(),
});

export const autofillInputSchema = z.object({
	jobDescription: z.string().trim().min(1).max(MAX_PASTED_JOB_DESCRIPTION_CHARS),
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
	// Extract structured fields from a pasted job description. The posting text itself is stored
	// verbatim on the application, so nothing here fetches or scrapes a URL.
	autofill: protectedProcedure
		.route({ method: "POST", path: "/applications/ai/autofill", operationId: "aiAutofillApplication", ...reserved })
		.input(autofillInputSchema)
		.use(aiRequestRateLimit)
		.output(autofillOutput)
		.errors({
			BAD_GATEWAY: { message: "The AI provider returned an error or is unreachable.", status: 502 },
			BAD_REQUEST: { message: "Invalid application or AI request.", status: 400 },
		})
		.handler(async ({ context, input }) => {
			const model = await resolveModel(context.user.id);

			return generateJson(
				model,
				`Extract the following fields from this job posting. Return ONLY JSON with keys company, role, location, salary. Use an empty string for anything not stated.\n\nJOB POSTING:\n${input.jobDescription}`,
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
		.errors({
			BAD_GATEWAY: { message: "The AI provider returned an error or is unreachable.", status: 502 },
			BAD_REQUEST: { message: "Invalid application or AI request.", status: 400 },
		})
		.handler(async ({ context, input }) => {
			const application = await applicationService.getById({ id: input.id, userId: context.user.id });
			if (!application.resumeId)
				throw new ORPCError("BAD_REQUEST", { message: "Link a resume to this application first." });
			if (!application.jobDescription) {
				throw new ORPCError("BAD_REQUEST", { message: "Paste the job description into this application first." });
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
		.errors({
			BAD_GATEWAY: { message: "The AI provider returned an error or is unreachable.", status: 502 },
			BAD_REQUEST: { message: "Invalid application or AI request.", status: 400 },
		})
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
		.errors({
			BAD_GATEWAY: { message: "The AI provider returned an error or is unreachable.", status: 502 },
			BAD_REQUEST: { message: "Invalid application or AI request.", status: 400 },
		})
		.handler(async ({ context, input }) => {
			const application = await applicationService.getById({ id: input.id, userId: context.user.id });
			if (!application.resumeId)
				throw new ORPCError("BAD_REQUEST", { message: "Link a resume to this application first." });
			if (!application.jobDescription) {
				throw new ORPCError("BAD_REQUEST", { message: "Paste the job description into this application first." });
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
