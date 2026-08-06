import type { PublicStyleProjection } from "@reactive-resume/pdf/public-projection";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { SemanticStylesheet } from "@reactive-resume/schema/resume/stylesheet";
import {
	getPublicStyleProjectionFingerprints,
	PUBLIC_STYLE_PROJECTION_FORMAT_VERSION,
	SEMANTIC_TREE_VERSION,
	validatePublicStyleProjection,
} from "@reactive-resume/pdf/public-projection";
import { createResumePdfBlob } from "@/features/resume/export/pdf-document";

export type PublicResumePdfOptions = {
	stylesheetMode: SemanticStylesheet["mode"];
	styleProjection?: PublicStyleProjection;
	refetchStyleProjection?: () => Promise<PublicStyleProjection | undefined>;
	publicResume: {
		username: string;
		slug: string;
	};
};

type ProjectionMismatchReason =
	| "format-version"
	| "language-version"
	| "semantic-tree-version"
	| "registry-fingerprint"
	| "adapter-fingerprint"
	| "render-data-hash"
	| "invalid-projection";

const projectionMismatchReason = async (
	data: ResumeData,
	projection: PublicStyleProjection,
): Promise<ProjectionMismatchReason | null> => {
	if (projection.formatVersion !== PUBLIC_STYLE_PROJECTION_FORMAT_VERSION) return "format-version";
	if (projection.languageVersion !== 1) return "language-version";
	if (projection.semanticTreeVersion !== SEMANTIC_TREE_VERSION) return "semantic-tree-version";
	const fingerprints = await getPublicStyleProjectionFingerprints();
	if (projection.registryFingerprint !== fingerprints.registryFingerprint) return "registry-fingerprint";
	if (projection.adapterFingerprint !== fingerprints.adapterFingerprint) return "adapter-fingerprint";
	return (await validatePublicStyleProjection(data, projection)) ? null : "render-data-hash";
};

const fetchPublicResumePdf = async (
	publicResume: PublicResumePdfOptions["publicResume"],
	reason: ProjectionMismatchReason | "missing-projection",
	projection?: PublicStyleProjection,
) => {
	const search = new URLSearchParams({
		reason,
		...(projection
			? {
					registryFingerprint: projection.registryFingerprint,
					adapterFingerprint: projection.adapterFingerprint,
				}
			: {}),
	});
	const response = await fetch(
		`/api/resumes/${encodeURIComponent(publicResume.username)}/${encodeURIComponent(publicResume.slug)}/pdf?${search}`,
		{ credentials: "include" },
	);
	if (!response.ok) throw new Error(`Public PDF fallback failed with ${response.status}`);
	return response.blob();
};

export async function resolvePublicResumePdfBlob({
	data,
	...options
}: PublicResumePdfOptions & { data: ResumeData }): Promise<Blob> {
	if (options.stylesheetMode === "legacy") return createResumePdfBlob(data);

	let projection = options.styleProjection;
	let refetched = false;
	const refetch = async () => {
		if (!options.refetchStyleProjection || refetched) return;
		refetched = true;
		try {
			projection = await options.refetchStyleProjection();
		} catch {
			projection = undefined;
		}
	};

	if (!projection) await refetch();
	if (!projection) return fetchPublicResumePdf(options.publicResume, "missing-projection");

	let reason = await projectionMismatchReason(data, projection).catch(() => "invalid-projection" as const);
	if (reason) {
		await refetch();
		if (!projection) return fetchPublicResumePdf(options.publicResume, "missing-projection");
		reason = await projectionMismatchReason(data, projection).catch(() => "invalid-projection" as const);
	}

	return reason
		? fetchPublicResumePdf(options.publicResume, reason, projection)
		: createResumePdfBlob(data, undefined, undefined, { publicStyleProjection: projection });
}
