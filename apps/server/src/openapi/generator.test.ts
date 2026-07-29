import { describe, expect, it } from "vitest";

describe("generateOpenApiSpec", () => {
	it("uses caller-provided application URL and version", async () => {
		process.env.APP_URL ??= "https://rxresu.me";
		process.env.DATABASE_URL ??= "postgresql://localhost/reactive_resume_test";
		process.env.AUTH_SECRET ??= "openapi-generator-test-process-only";
		const { generateOpenApiSpec } = await import("./generator");
		const spec = await generateOpenApiSpec({
			appUrl: "https://rxresu.me",
			version: "9.8.7",
		});

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
});
