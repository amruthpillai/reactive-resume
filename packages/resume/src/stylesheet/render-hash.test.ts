import { describe, expect, it } from "vitest";
import { computeRenderDataHash } from "./render-hash";

describe("public render hashing", () => {
	it("hashes logically equivalent public render inputs identically", async () => {
		const first = await computeRenderDataHash({ domainVersion: 1, data: { b: 2, a: 1 } });
		const second = await computeRenderDataHash({ domainVersion: 1, data: { a: 1, b: 2 } });

		expect(first).toBe(second);
	});

	it("uses the domain-separated RFC 8785 SHA-256 vector", async () => {
		await expect(computeRenderDataHash({ domainVersion: 1, data: { a: 1 } })).resolves.toBe(
			"81d98262808eb01af7bb5cf35b721acf0454659330e1715c665e42efffc27e55",
		);
	});

	it("includes source-free resolved nodes and fingerprints", async () => {
		const base = { domainVersion: 1, data: { resume: { name: "Ada" } } };
		const first = await computeRenderDataHash({
			...base,
			resolvedNodes: { name: { style: { color: "red" } } },
			projectionFingerprints: { adapter: "v1", registry: "v1" },
		});
		const second = await computeRenderDataHash({
			...base,
			resolvedNodes: { name: { style: { color: "blue" } } },
			projectionFingerprints: { adapter: "v1", registry: "v1" },
		});

		expect(first).not.toBe(second);
	});

	it.each([undefined, Number.NaN, Number.POSITIVE_INFINITY, 1n, new Date()])(
		"rejects non-I-JSON values",
		async (data) => {
			await expect(computeRenderDataHash({ domainVersion: 1, data })).rejects.toThrow("I-JSON");
		},
	);

	it("rejects unpaired surrogates before canonicalization", async () => {
		const malformed = String.fromCharCode(0xd800);
		await expect(computeRenderDataHash({ domainVersion: 1, data: malformed })).rejects.toThrow("I-JSON");
	});

	it("rejects hidden toJSON hooks before canonicalization", async () => {
		const data = {};
		Object.defineProperty(data, "toJSON", { value: () => ({ altered: true }) });
		await expect(computeRenderDataHash({ domainVersion: 1, data })).rejects.toThrow("I-JSON");
	});

	it("rejects unknown hash-domain versions", async () => {
		await expect(computeRenderDataHash({ domainVersion: 2, data: {} })).rejects.toThrow("domain version");
	});
});
