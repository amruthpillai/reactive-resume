import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createPublicResumePdf } from "./public-pdf";

// The real lookup query, run against a stand-in `pg` client that records the SQL and returns `rows`.
const pg = vi.hoisted(() => ({ queries: [] as { text: string; params: unknown[] }[], rows: [] as unknown[][] }));
vi.mock("@reactive-resume/db/client", async () => {
	const { drizzle } = await import("drizzle-orm/node-postgres");
	const client = {
		query: ({ text }: { text: string }, params: unknown[]) => {
			pg.queries.push({ text, params });
			return Promise.resolve({ rows: pg.rows });
		},
	};
	return { db: drizzle({ client: client as never }) };
});

const requestHeaders = new Headers({ "x-forwarded-for": "203.0.113.7" });
const input = {
	username: "jane",
	slug: "resume",
	requestHeaders,
	trustedClient: "203.0.113.9",
};

const buildResume = (overrides: Partial<{ isPublic: boolean; passwordHash: string | null }> = {}) => ({
	id: "resume-1",
	userId: "owner-1",
	data: structuredClone(defaultResumeData),
	isPublic: overrides.isPublic ?? true,
	passwordHash: overrides.passwordHash ?? null,
});

const dependencies = (resume = buildResume()) => ({
	findResume: vi.fn().mockResolvedValue(resume),
	hasPasswordAccess: vi.fn().mockReturnValue(true),
	resolveCurrentUserId: vi.fn().mockResolvedValue(undefined),
	rateLimiter: { consume: vi.fn() },
	renderPdf: vi.fn().mockResolvedValue(new File(["%PDF"], "resume.pdf", { type: "application/pdf" })),
});

describe("createPublicResumePdf", () => {
	beforeEach(() => {
		pg.queries = [];
		pg.rows = [];
	});

	it("authorizes private and password-protected resumes before budget or render", async () => {
		const privateDependencies = dependencies(buildResume({ isPublic: false }));
		await expect(createPublicResumePdf(input, privateDependencies)).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(privateDependencies.rateLimiter.consume).not.toHaveBeenCalled();
		expect(privateDependencies.renderPdf).not.toHaveBeenCalled();

		const passwordDependencies = dependencies(buildResume({ passwordHash: "hash" }));
		passwordDependencies.hasPasswordAccess.mockReturnValue(false);
		await expect(createPublicResumePdf(input, passwordDependencies)).rejects.toMatchObject({ code: "NEED_PASSWORD" });
		expect(passwordDependencies.rateLimiter.consume).not.toHaveBeenCalled();
		expect(passwordDependencies.renderPdf).not.toHaveBeenCalled();
	});

	it("does not look in Trash, so a trashed resume's link stops serving its PDF", async () => {
		await expect(createPublicResumePdf(input)).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(pg.queries.at(-1)?.text).toContain('"resume"."trashed_at" is null');
	});

	it("matches renamed slugs via resumeSlugRedirect and returns rendered PDF", async () => {
		const resume = buildResume();
		resume.data.basics.name = "Ada Lovelace";
		pg.rows = [[resume.id, resume.userId, resume.data, resume.isPublic, resume.passwordHash]];

		const customDeps = {
			resolveCurrentUserId: vi.fn().mockResolvedValue(undefined),
			rateLimiter: { consume: vi.fn() },
			renderPdf: vi.fn().mockResolvedValue(new File(["%PDF"], "ada-lovelace.pdf", { type: "application/pdf" })),
		};
		const result = await createPublicResumePdf({ ...input, slug: "old-slug" }, customDeps);

		const [query] = pg.queries;
		expect(query?.text).toContain('"resume_slug_redirect"');
		expect(query?.text).toContain('"resume_slug_redirect"."expires_at" > now()');
		expect(query?.text).toContain('"resume_slug_redirect"."user_id" = "resume"."user_id"');
		expect(query?.text).toContain('order by "resume"."slug" = $4 desc');
		expect(query?.params[0]).toBe("old-slug");
		expect(query?.params[1]).toBe("old-slug");
		expect(query?.params[2]).toBe("jane");
		expect(query?.params[3]).toBe("old-slug");
		expect(customDeps.rateLimiter.consume).toHaveBeenCalledWith({
			trustedClient: input.trustedClient,
			resumeId: resume.id,
		});
		expect(customDeps.renderPdf).toHaveBeenCalledWith({ data: resume.data, filename: "ada-lovelace.pdf" });
		expect(result.filename).toBe("ada-lovelace.pdf");
		expect(result.body).toBeInstanceOf(File);
	});

	it("requires password when downloading via renamed slug", async () => {
		const resume = buildResume({ passwordHash: "hash" });
		pg.rows = [[resume.id, resume.userId, resume.data, resume.isPublic, resume.passwordHash]];

		await expect(
			createPublicResumePdf(
				{ ...input, slug: "old-slug" },
				{
					rateLimiter: { consume: vi.fn() },
					renderPdf: vi.fn(),
				},
			),
		).rejects.toMatchObject({
			code: "NEED_PASSWORD",
			data: { username: "jane", slug: "old-slug" },
		});
	});

	it("rejects with NOT_FOUND when redirect or resume does not exist", async () => {
		pg.rows = [];
		await expect(createPublicResumePdf({ ...input, slug: "missing-slug" })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});

	it("renders on demand with canonical public stylesheet source", async () => {
		const resume = buildResume();
		resume.data.basics.name = "Ada Lovelace";
		resume.data.metadata.stylesheet = {
			mode: "semantic",
			source: { languageVersion: 1, text: "@version 1;\nname { color: blue; }\n" },
		};
		const pdfDependencies = dependencies(resume);

		const result = await createPublicResumePdf(input, pdfDependencies);

		expect(result.filename).toBe("ada-lovelace.pdf");
		expect(pdfDependencies.rateLimiter.consume).toHaveBeenCalledWith({
			trustedClient: input.trustedClient,
			resumeId: resume.id,
		});
		expect(pdfDependencies.renderPdf).toHaveBeenCalledWith({ data: resume.data, filename: "ada-lovelace.pdf" });
	});
});
