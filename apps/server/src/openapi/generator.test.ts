import { describe, expect, it } from "vitest";
import { generateOpenApiSpec } from "./generator";

describe("generateOpenApiSpec", () => {
	it("uses caller-provided application URL and version", async () => {
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
