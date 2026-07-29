import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { PublicRenderAccessDependencies } from "./public-style-projection";
import { ORPCError } from "@orpc/server";
import { generateFilename } from "@reactive-resume/utils/file";
import { publicRenderRateLimiter } from "./public-render-rate-limit";
import { defaultPublicRenderAccessDependencies, loadAuthorizedPublicRenderResume } from "./public-style-projection";
import { hashSemanticCssResumeId } from "./stylesheet-observability";

export type PublicResumePdfMismatchReason =
	| "missing-projection"
	| "format-version"
	| "language-version"
	| "semantic-tree-version"
	| "registry-fingerprint"
	| "adapter-fingerprint"
	| "render-data-hash"
	| "invalid-projection";

export const PUBLIC_RESUME_PDF_MISMATCH_REASONS = [
	"missing-projection",
	"format-version",
	"language-version",
	"semantic-tree-version",
	"registry-fingerprint",
	"adapter-fingerprint",
	"render-data-hash",
	"invalid-projection",
] as const satisfies readonly PublicResumePdfMismatchReason[];

export type CreatePublicResumePdfInput = {
	username: string;
	slug: string;
	requestHeaders: Headers;
	trustedClient: string;
	mismatchReason: PublicResumePdfMismatchReason;
	clientRegistryFingerprint?: string;
	clientAdapterFingerprint?: string;
};

export type PublicResumePdfDependencies = PublicRenderAccessDependencies & {
	resolveCurrentUserId(requestHeaders: Headers): Promise<string | undefined>;
	rateLimiter: { consume(input: { trustedClient: string; resumeId: string }): void };
	renderPdf(input: { data: ResumeData; filename: string }): Promise<File>;
	getFingerprints(): Promise<{ registryFingerprint: string; adapterFingerprint: string }>;
	now(): number;
	observe(event: Readonly<Record<string, unknown>>): void;
};

const defaultDependencies: PublicResumePdfDependencies = {
	...defaultPublicRenderAccessDependencies,
	resolveCurrentUserId: async (requestHeaders) =>
		(await import("../../context")).resolveUserFromRequestHeaders(requestHeaders).then((user) => user?.id),
	rateLimiter: publicRenderRateLimiter,
	renderPdf: async (input) => (await import("@reactive-resume/pdf/server")).createResumePdfFile(input),
	getFingerprints: async () =>
		(await import("@reactive-resume/pdf/public-projection")).getPublicStyleProjectionFingerprints(),
	now: Date.now,
	observe: console.info,
};

export async function createPublicResumePdf(
	input: CreatePublicResumePdfInput,
	dependencies: PublicResumePdfDependencies = defaultDependencies,
): Promise<{ body: File; filename: string; cacheControl: string }> {
	const fingerprintPattern = /^[a-f0-9]{64}$/;
	if (
		!PUBLIC_RESUME_PDF_MISMATCH_REASONS.includes(input.mismatchReason) ||
		(input.clientRegistryFingerprint !== undefined && !fingerprintPattern.test(input.clientRegistryFingerprint)) ||
		(input.clientAdapterFingerprint !== undefined && !fingerprintPattern.test(input.clientAdapterFingerprint))
	) {
		throw new ORPCError("BAD_REQUEST", { status: 400, message: "Invalid public PDF fallback metadata." });
	}
	const currentUserId = await dependencies.resolveCurrentUserId(input.requestHeaders);
	const resume = await loadAuthorizedPublicRenderResume(
		{
			username: input.username,
			slug: input.slug,
			requestHeaders: input.requestHeaders,
			trustedClient: input.trustedClient,
			...(currentUserId ? { currentUserId } : {}),
		},
		dependencies,
	);
	dependencies.rateLimiter.consume({ trustedClient: input.trustedClient, resumeId: resume.id });
	const startedAt = dependencies.now();
	const fingerprints = await dependencies.getFingerprints();
	const event = (success: boolean) => {
		dependencies.observe({
			name: "semantic_css.render_fallback",
			resumeIdHash: hashSemanticCssResumeId(resume.id),
			mismatchReason: input.mismatchReason,
			...(input.clientRegistryFingerprint ? { clientRegistryFingerprint: input.clientRegistryFingerprint } : {}),
			...(input.clientAdapterFingerprint ? { clientAdapterFingerprint: input.clientAdapterFingerprint } : {}),
			...fingerprints,
			durationMs: Math.max(0, dependencies.now() - startedAt),
			success,
		});
	};

	try {
		const filename = generateFilename(resume.data.basics.name || "Resume", "pdf");
		const body = await dependencies.renderPdf({ data: resume.data, filename });
		event(true);
		return {
			body,
			filename,
			cacheControl: "private, no-store",
		};
	} catch (error) {
		event(false);
		throw error;
	}
}
