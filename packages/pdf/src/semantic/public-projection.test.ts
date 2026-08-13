import type { PublicStyleProjection } from "./public-projection";
import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import {
	createPublicStyleProjection,
	PUBLIC_STYLE_PROJECTION_FORMAT_VERSION,
	SEMANTIC_TREE_VERSION,
	validatePublicStyleProjection,
} from "./public-projection";

const buildData = () => {
	const data = structuredClone(defaultResumeData);
	const applied = {
		languageVersion: 1,
		text: "@version 1;\nname { color: #123456; }\n",
	};
	data.basics.name = "Ada Lovelace";
	data.metadata.layout.pages = [{ fullWidth: true, main: [], sidebar: [] }];
	data.metadata.stylesheet = { mode: "semantic", source: applied, applied };
	return data;
};

describe("public semantic style projection", () => {
	it("contains only resolved, JSON-safe presentation keyed by stable node key", async () => {
		const projection = await createPublicStyleProjection({ data: buildData() });
		const serialized = JSON.stringify(projection);

		expect(projection).toMatchObject({
			formatVersion: PUBLIC_STYLE_PROJECTION_FORMAT_VERSION,
			languageVersion: 1,
			semanticTreeVersion: SEMANTIC_TREE_VERSION,
			registryFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
			adapterFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
			renderDataHash: expect.stringMatching(/^[a-f0-9]{64}$/),
		});
		expect(projection.nodes["page-1/region-header/header/name"]).toEqual({
			style: { color: "#123456" },
		});
		expect(serialized).not.toContain("@version");
		expect(serialized).not.toMatch(/source|comment|diagnostic|selector|variable|range/i);
		expect(serialized).not.toContain("undefined");
	});

	it("carries final sibling visibility and order without stylesheet source", async () => {
		const data = buildData();
		data.basics.email = "ada@example.com";
		data.basics.phone = "+44 123";
		data.basics.location = "London";
		const applied = {
			languageVersion: 1,
			text: `@version 1;
				contact-item[name="location"] { display: none; }
				contact-item[name="phone"] { order: -1; }
			`,
		};
		data.metadata.stylesheet = { mode: "semantic", source: applied, applied };

		const projection = await createPublicStyleProjection({ data });

		expect(projection.nodes["page-1/region-header/header/contact-list/contact-location"]).toMatchObject({
			hidden: true,
		});
		expect(projection.nodes["page-1/region-header/header/contact-list/contact-phone"]).toMatchObject({ order: 0 });
		expect(projection.nodes["page-1/region-header/header/contact-list/contact-email"]).toMatchObject({ order: 1 });
	});

	it("rejects changed nodes and every version or fingerprint mismatch", async () => {
		const data = buildData();
		const valid = await createPublicStyleProjection({ data });
		const cases = [
			{ ...valid, formatVersion: 2 },
			{ ...valid, languageVersion: 2 },
			{ ...valid, semanticTreeVersion: 2 },
			{ ...valid, registryFingerprint: "0".repeat(64) },
			{ ...valid, adapterFingerprint: "0".repeat(64) },
			{ ...valid, renderDataHash: "0".repeat(64) },
			{
				...valid,
				nodes: {
					...valid.nodes,
					"page-1/region-header/header/name": { style: { color: "#ff0000" } },
				},
			},
		];

		for (const projection of cases) {
			await expect(validatePublicStyleProjection(data, projection as unknown as PublicStyleProjection)).resolves.toBe(
				false,
			);
		}
	});

	it("rejects projections hashed for different public render data", async () => {
		const data = buildData();
		const projection = await createPublicStyleProjection({ data });
		const changed = structuredClone(data);
		changed.basics.name = "Grace Hopper";

		await expect(validatePublicStyleProjection(changed, projection)).resolves.toBe(false);
	});

	it("changes the projection hash when only the applied presentation changes", async () => {
		const red = buildData();
		const blue = buildData();
		const blueApplied = {
			languageVersion: 1,
			text: "@version 1;\nname { color: #654321; }\n",
		};
		blue.metadata.stylesheet = { mode: "semantic", source: blueApplied, applied: blueApplied };

		const redProjection = await createPublicStyleProjection({ data: red });
		const blueProjection = await createPublicStyleProjection({ data: blue });

		expect(redProjection.nodes["page-1/region-header/header/name"]).not.toEqual(
			blueProjection.nodes["page-1/region-header/header/name"],
		);
		expect(redProjection.renderDataHash).not.toBe(blueProjection.renderDataHash);
	});

	it("rejects extra or non-JSON node fields instead of exposing compiler internals", async () => {
		const data = buildData();
		const projection = await createPublicStyleProjection({ data });
		const node = projection.nodes["page-1/region-header/header/name"];

		await expect(
			validatePublicStyleProjection(data, {
				...projection,
				nodes: {
					...projection.nodes,
					"page-1/region-header/header/name": { ...node, diagnostics: [{ message: "private" }] },
				},
			} as unknown as PublicStyleProjection),
		).resolves.toBe(false);
	});
});
