import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { projectPublicRenderData, projectRenderData } from "./render-data";
import { computeRenderDataHash } from "./render-hash";

const legacyData: ResumeData = {
	...defaultResumeData,
	metadata: {
		...defaultResumeData.metadata,
		styleRules: [
			{
				id: "legacy",
				label: "Legacy",
				enabled: true,
				target: { scope: "global" },
				slots: { text: { color: "#123456" } },
			},
		],
	},
};

const semanticData: ResumeData = {
	...legacyData,
	metadata: {
		...legacyData.metadata,
		stylesheet: {
			mode: "semantic",
			source: { languageVersion: 1, text: "@version 1;\nfield { color: red; }" },
		},
	},
};

describe("render-data projection", () => {
	it("separates resume render-data identity from stylesheet revision identity", () => {
		const legacy = projectRenderData(legacyData);
		const semanticPrivate = projectRenderData(semanticData);
		const semanticPublic = projectPublicRenderData(semanticData);

		expect(legacy.metadata.styleRules).toEqual(legacyData.metadata.styleRules);
		expect(semanticPrivate.metadata.styleRules).toBeUndefined();
		expect(semanticPrivate.metadata.stylesheet).toBeUndefined();
		expect(semanticPublic.metadata.styleRules).toBeUndefined();
		expect(semanticPublic.metadata.stylesheet).toBeUndefined();
		expect(semanticPublic.metadata.notes).toBeUndefined();
	});

	it("excludes unknown and server-only data at every projection boundary", () => {
		const looseData = {
			...semanticData,
			dashboard: { secret: true },
			revisions: { stylesheetRevision: 4, renderDataVersion: 8 },
			metadata: {
				...semanticData.metadata,
				notes: "private",
				diagnostics: [{ message: "private" }],
				serverMetadata: { secret: true },
			},
			picture: { ...semanticData.picture, unknownPictureField: true },
		} as ResumeData;

		const privateProjection = projectRenderData(looseData) as Record<string, unknown>;
		const publicProjection = projectPublicRenderData(looseData) as Record<string, unknown>;

		for (const projection of [privateProjection, publicProjection]) {
			expect(projection).not.toHaveProperty("dashboard");
			expect(projection).not.toHaveProperty("revisions");
			expect(projection.metadata).not.toHaveProperty("notes");
			expect(projection.metadata).not.toHaveProperty("diagnostics");
			expect(projection.metadata).not.toHaveProperty("serverMetadata");
			expect(projection.picture).not.toHaveProperty("unknownPictureField");
		}
	});

	it("keeps public projection hashes invariant to owner-only metadata", async () => {
		const baseline = projectPublicRenderData(semanticData);
		const ownerOnlyMutation = {
			...semanticData,
			dashboard: { private: true },
			revisions: { renderDataVersion: 9, stylesheetRevision: 11 },
			metadata: {
				...semanticData.metadata,
				notes: "owner-only note",
				diagnostics: [{ message: "owner-only diagnostic" }],
				serverMetadata: { private: true },
			},
		} as ResumeData;
		const mutated = projectPublicRenderData(ownerOnlyMutation);

		expect(mutated).toEqual(baseline);
		await expect(computeRenderDataHash({ domainVersion: 1, data: mutated })).resolves.toBe(
			await computeRenderDataHash({ domainVersion: 1, data: baseline }),
		);
	});
});
