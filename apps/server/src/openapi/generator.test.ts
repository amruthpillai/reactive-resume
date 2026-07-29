import { describe, expect, it } from "vitest";
import { createResumeDataJsonSchema } from "@reactive-resume/schema/resume/json-schema";

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

async function generateSpec() {
	process.env.APP_URL ??= "https://rxresu.me";
	process.env.DATABASE_URL ??= "postgresql://localhost/reactive_resume_test";
	process.env.AUTH_SECRET ??= "openapi-generator-test-process-only";
	const { generateOpenApiSpec } = await import("./generator");
	return generateOpenApiSpec({
		appUrl: "https://rxresu.me",
		version: "9.8.7",
	});
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
	});

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

	it("does not publish impossible request schemas", async () => {
		const spec = (await generateSpec()) as GeneratedSpecView;
		const impossibleRequests: string[] = [];

		for (const [path, operations] of Object.entries(spec.paths ?? {})) {
			for (const [method, operation] of Object.entries(operations)) {
				const requestSchema = operation.requestBody?.content?.["application/json"]?.schema;
				if (containsImpossibleSchema(requestSchema)) impossibleRequests.push(`${method.toUpperCase()} ${path}`);
			}
		}

		expect(impossibleRequests).toEqual([]);
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
