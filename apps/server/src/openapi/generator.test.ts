import { describe, expect, it } from "vitest";
import z from "zod";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createResumeDataJsonSchema } from "@reactive-resume/schema/resume/json-schema";
import { writableResumeDataSchema } from "@reactive-resume/schema/resume/write";

type GeneratedSpecView = {
	components?: { schemas?: Record<string, unknown> };
	paths?: Record<
		string,
		Record<
			string,
			{
				requestBody?: {
					content?: Record<string, { schema?: unknown }>;
				};
			}
		>
	>;
};

// Building the spec walks every router and resume JSON schema, which costs seconds. It is
// deterministic and every test here only reads it, so generate it once for the whole file —
// regenerating per test made the first case time out under a loaded machine.
let specPromise: ReturnType<typeof generateOnce> | undefined;

async function generateOnce() {
	const { generateOpenApiSpec } = await import("./generator");
	return generateOpenApiSpec({
		appUrl: "https://rxresu.me",
		version: "9.8.7",
	});
}

function generateSpec() {
	specPromise ??= generateOnce();
	return specPromise;
}

function getRequestSchema(spec: GeneratedSpecView, path: string, method: string) {
	return spec.paths?.[path]?.[method]?.requestBody?.content?.["application/json"]?.schema;
}

function containsImpossibleSchema(value: unknown): boolean {
	if (Array.isArray(value)) return value.some(containsImpossibleSchema);
	if (typeof value !== "object" || value === null) return false;
	const object = value as Record<string, unknown>;
	const negated = object.not;
	if (typeof negated === "object" && negated !== null && Object.keys(negated).length === 0) {
		return true;
	}
	return Object.values(object).some(containsImpossibleSchema);
}

function findImpossibleRequestSchemas(spec: GeneratedSpecView) {
	const impossibleRequests: string[] = [];
	for (const [path, operations] of Object.entries(spec.paths ?? {})) {
		for (const [method, operation] of Object.entries(operations)) {
			for (const [mediaType, content] of Object.entries(operation.requestBody?.content ?? {})) {
				if (containsImpossibleSchema(content.schema)) {
					impossibleRequests.push(`${method.toUpperCase()} ${path} (${mediaType})`);
				}
			}
		}
	}
	return impossibleRequests;
}

describe("generateOpenApiSpec", () => {
	it("uses caller-provided application URL and version", async () => {
		const spec = await generateSpec();

		expect(spec.info).toMatchObject({
			title: "Reactive Resume",
			version: "9.8.7",
		});
		expect(spec.servers).toEqual([{ url: "https://rxresu.me/api/openapi" }]);
		expect(spec.externalDocs).toEqual({
			url: "https://docs.rxresu.me",
			description: "Reactive Resume Documentation",
		});
	}, 15_000);

	it("uses the canonical input-side ResumeData schema in update requests", async () => {
		const spec = (await generateSpec()) as GeneratedSpecView;
		const { $schema: _dialect, ...canonicalInputSchema } = createResumeDataJsonSchema();

		expect(spec.components?.schemas?.ResumeData).toEqual(canonicalInputSchema);
		expect(getRequestSchema(spec, "/resumes/{id}", "put")).toMatchObject({
			properties: {
				data: { $ref: "#/components/schemas/ResumeData" },
			},
		});
	});

	it("publishes the custom-section type and item correlation", async () => {
		const spec = (await generateSpec()) as GeneratedSpecView;
		const schema = z.fromJSONSchema(spec.components?.schemas?.ResumeData as Parameters<typeof z.fromJSONSchema>[0]);
		const mismatched = {
			...defaultResumeData,
			customSections: [
				{
					id: "custom-experience",
					type: "experience",
					title: "Experience",
					icon: "",
					columns: 1,
					hidden: false,
					keepTogether: false,
					startOnNewPage: false,
					items: [{ id: "summary-item", hidden: false, content: "<p>Not an experience item</p>" }],
				},
			],
		};

		expect(schema.safeParse(mismatched).success).toBe(false);
	});

	it("enforces the same submitted bounds as the published request schema", async () => {
		const spec = (await generateSpec()) as GeneratedSpecView;
		const published = z.fromJSONSchema(spec.components?.schemas?.ResumeData as Parameters<typeof z.fromJSONSchema>[0]);
		for (const marginX of [0, 100, -1, 500]) {
			const data = structuredClone(defaultResumeData);
			data.metadata.page.marginX = marginX;
			const expected = marginX === 0 || marginX === 100;
			expect(published.safeParse(data).success).toBe(expected);
			expect(writableResumeDataSchema.safeParse(data).success).toBe(expected);
		}
	});

	it("does not publish impossible request schemas", async () => {
		const spec = (await generateSpec()) as GeneratedSpecView;

		expect(findImpossibleRequestSchemas(spec)).toEqual([]);
	});

	it("checks every request body media type for impossible schemas", () => {
		const spec: GeneratedSpecView = {
			paths: {
				"/documents": {
					post: {
						requestBody: {
							content: {
								"application/json": { schema: { type: "object" } },
								"multipart/form-data": { schema: { not: {} } },
							},
						},
					},
				},
			},
		};

		expect(findImpossibleRequestSchemas(spec)).toEqual(["POST /documents (multipart/form-data)"]);
	});

	it("documents imported data as an accepted ResumeData input", async () => {
		const spec = (await generateSpec()) as GeneratedSpecView;

		expect(getRequestSchema(spec, "/resumes/import", "post")).toEqual({
			type: "object",
			properties: {
				data: { $ref: "#/components/schemas/ResumeData" },
			},
			required: ["data"],
		});
	});
});
