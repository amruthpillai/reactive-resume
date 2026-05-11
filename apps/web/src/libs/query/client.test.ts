import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { getQueryClient } from "./client";

describe("getQueryClient", () => {
	it("returns a QueryClient instance", () => {
		const client = getQueryClient();
		expect(client).toBeInstanceOf(QueryClient);
	});

	it("returns a fresh client on each call", () => {
		const a = getQueryClient();
		const b = getQueryClient();
		expect(a).not.toBe(b);
	});

	it("hashes the query key into a deterministic JSON string", () => {
		const client = getQueryClient();
		const fn = client.getDefaultOptions().queries?.queryKeyHashFn;
		expect(typeof fn).toBe("function");

		const hashA = fn?.(["resumes", { id: "abc" }]);
		const hashB = fn?.(["resumes", { id: "abc" }]);
		const hashC = fn?.(["resumes", { id: "xyz" }]);

		expect(hashA).toBe(hashB);
		expect(hashA).not.toBe(hashC);
		expect(typeof hashA).toBe("string");
		// json/meta envelope is included
		expect(hashA).toContain('"json"');
	});

	it("round-trips data through dehydrate/hydrate via oRPC serializer", () => {
		const client = getQueryClient();
		const serializeData = client.getDefaultOptions().dehydrate?.serializeData;
		const deserializeData = client.getDefaultOptions().hydrate?.deserializeData;

		expect(serializeData).toBeTypeOf("function");
		expect(deserializeData).toBeTypeOf("function");

		const original = { id: "x", count: 3, when: new Date("2024-01-01T00:00:00Z") };
		const serialized = serializeData?.(original);
		const restored = deserializeData?.(serialized) as typeof original;

		expect(restored.id).toBe(original.id);
		expect(restored.count).toBe(original.count);
		expect(restored.when.getTime()).toBe(original.when.getTime());
	});
});
