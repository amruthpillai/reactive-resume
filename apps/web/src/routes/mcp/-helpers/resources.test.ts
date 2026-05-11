// biome-ignore-all lint/style/noNonNullAssertion: These tests assert registered resource names before exercising their handlers.
import { describe, expect, it, vi } from "vitest";

// Avoid pulling in env-validated modules through `./tools`.
vi.mock("./tools", async () => await import("./mcp-tool-names"));

const clientMock = vi.hoisted(() => ({
	resume: {
		getById: vi.fn(),
	},
}));

vi.mock("@/libs/orpc/client", () => ({ client: clientMock }));

const { registerResources } = await import("./resources");

type ResourceHandler = (uri: URL) => Promise<{
	contents: Array<{ uri: string; mimeType: string; text: string }>;
}>;

type Registration = {
	name: string;
	uriOrTemplate: unknown;
	metadata: Record<string, unknown>;
	handler: ResourceHandler;
};

const makeFakeServer = () => {
	const registered: Registration[] = [];
	const server = {
		registerResource: vi.fn(
			(name: string, uriOrTemplate: unknown, metadata: Record<string, unknown>, handler: ResourceHandler) => {
				registered.push({ name, uriOrTemplate, metadata, handler });
			},
		),
	};
	return { server, registered };
};

describe("registerResources", () => {
	it("registers the resume and resume-schema resources", () => {
		const { server, registered } = makeFakeServer();
		registerResources(server as never);

		expect(server.registerResource).toHaveBeenCalledTimes(2);
		expect(registered.map((r) => r.name).sort()).toEqual(["resume", "resume-schema"]);
	});

	it("resume handler fetches resume data via the oRPC client and returns it as JSON", async () => {
		clientMock.resume.getById.mockResolvedValueOnce({ data: { id: "abc", basics: { name: "Jane" } } });

		const { server, registered } = makeFakeServer();
		registerResources(server as never);

		const resume = registered.find((r) => r.name === "resume")!;
		const result = await resume.handler(new URL("resume://abc"));

		expect(clientMock.resume.getById).toHaveBeenCalledWith({ id: "abc" });
		expect(result.contents[0]?.uri).toBe("resume://abc");
		expect(result.contents[0]?.mimeType).toBe("application/json");
		expect(JSON.parse(result.contents[0]?.text)).toEqual({ id: "abc", basics: { name: "Jane" } });
	});

	it("resume handler throws when the URI has no id segment", async () => {
		const { server, registered } = makeFakeServer();
		registerResources(server as never);

		const resume = registered.find((r) => r.name === "resume")!;
		await expect(resume.handler(new URL("resume://"))).rejects.toThrow(/Invalid resume URI/);
	});

	it("resume-schema handler returns the static JSON schema as text", async () => {
		const { server, registered } = makeFakeServer();
		registerResources(server as never);

		const resumeSchema = registered.find((r) => r.name === "resume-schema")!;
		const result = await resumeSchema.handler(new URL("resume://_meta/schema"));

		expect(result.contents[0]?.uri).toBe("resume://_meta/schema");
		expect(result.contents[0]?.mimeType).toBe("application/json");

		// Should round-trip through JSON.parse without throwing.
		expect(() => JSON.parse(result.contents[0]?.text)).not.toThrow();
	});
});
