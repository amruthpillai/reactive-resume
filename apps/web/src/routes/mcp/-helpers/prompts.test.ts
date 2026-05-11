// biome-ignore-all lint/style/noNonNullAssertion: These tests assert registered prompt names before exercising their handlers.
import { describe, expect, it, vi } from "vitest";

// `./tools` pulls in the env / db client modules which require runtime env vars.
// `prompts.ts` only imports `MCP_TOOL_NAME` from `./tools`, so we stub it with the
// pure constants module to keep this test isolated.
vi.mock("./tools", async () => await import("./mcp-tool-names"));

const { registerPrompts } = await import("./prompts");

type Registration = {
	name: string;
	config: {
		title: string;
		description: string;
		argsSchema: Record<string, unknown>;
	};
	handler: (args: { id: string }) => Promise<{
		messages: Array<{
			role: "user";
			content: { type: string; text?: string; resource?: { uri: string; mimeType: string } };
		}>;
	}>;
};

const makeFakeServer = () => {
	const registered: Registration[] = [];
	const server = {
		registerPrompt: vi.fn((name: string, config: Registration["config"], handler: Registration["handler"]) => {
			registered.push({ name, config, handler });
		}),
	};
	return { server, registered };
};

describe("registerPrompts", () => {
	it("registers build_resume, improve_resume, and review_resume", () => {
		const { server, registered } = makeFakeServer();

		registerPrompts(server as never);

		expect(server.registerPrompt).toHaveBeenCalledTimes(3);
		expect(registered.map((r) => r.name).sort()).toEqual(["build_resume", "improve_resume", "review_resume"]);
	});

	it("requires an `id` argument on every prompt", () => {
		const { server, registered } = makeFakeServer();

		registerPrompts(server as never);

		for (const reg of registered) {
			expect(reg.config.argsSchema.id, reg.name).toBeDefined();
		}
	});

	it("build_resume handler attaches the resume + schema resources and a guidance text", async () => {
		const { server, registered } = makeFakeServer();
		registerPrompts(server as never);

		const build = registered.find((r) => r.name === "build_resume")!;
		const result = await build.handler({ id: "abc-123" });

		const resourceUris = result.messages
			.filter((m) => m.content.type === "resource")
			.map((m) => m.content.resource?.uri);

		expect(resourceUris).toContain("resume://abc-123");
		expect(resourceUris).toContain("resume://_meta/schema");

		const textMessage = result.messages.find((m) => m.content.type === "text");
		expect(textMessage?.content.text).toContain("step by step");
		expect(textMessage?.content.text).toContain("JSON Patch");
	});

	it("improve_resume handler tells the model not to fabricate information", async () => {
		const { server, registered } = makeFakeServer();
		registerPrompts(server as never);

		const improve = registered.find((r) => r.name === "improve_resume")!;
		const result = await improve.handler({ id: "id-1" });

		const text = result.messages.find((m) => m.content.type === "text")?.content.text ?? "";
		expect(text).toContain("Do NOT fabricate");
		expect(text).toContain("Passive voice");
	});

	it("review_resume handler is read-only and forbids patching", async () => {
		const { server, registered } = makeFakeServer();
		registerPrompts(server as never);

		const review = registered.find((r) => r.name === "review_resume")!;
		const result = await review.handler({ id: "id-2" });

		const text = result.messages.find((m) => m.content.type === "text")?.content.text ?? "";
		expect(text).toContain("read-only");
		expect(text).toContain("Do NOT call");
		expect(text).toContain("Scorecard");
	});

	it("interpolates the provided resume id into the resource URI", async () => {
		const { server, registered } = makeFakeServer();
		registerPrompts(server as never);

		const review = registered.find((r) => r.name === "review_resume")!;
		const result = await review.handler({ id: "8f-test" });

		const resourceUris = result.messages
			.filter((m) => m.content.type === "resource")
			.map((m) => m.content.resource?.uri);

		expect(resourceUris).toContain("resume://8f-test");
	});
});
