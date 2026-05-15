import { describe, expect, it } from "vitest";
import { buildMcpServerCard } from "./mcp-server-card";
import { MCP_TOOL_NAME } from "./mcp-tool-names";

describe("buildMcpServerCard", () => {
	const card = buildMcpServerCard("1.2.3");

	it("includes the provided app version in serverInfo", () => {
		expect(card.serverInfo.version).toBe("1.2.3");
	});

	it("identifies the server as reactive-resume", () => {
		expect(card.serverInfo.name).toBe("reactive-resume");
		expect(card.serverInfo.title).toBe("Reactive Resume");
		expect(card.serverInfo.websiteUrl).toBe("https://rxresu.me");
	});

	it("exposes light + dark theme icons", () => {
		const themes = card.serverInfo.icons.map((icon) => icon.theme).sort();
		expect(themes).toEqual(["dark", "light"]);
	});

	it("requires authentication with oauth2 + bearer schemes", () => {
		expect(card.authentication.required).toBe(true);
		expect(card.authentication.schemes).toContain("oauth2");
		expect(card.authentication.schemes).toContain("bearer");
	});

	it("registers one entry per MCP tool", () => {
		const cardToolNames = card.tools.map((tool) => tool.name).sort();
		const expectedNames = Object.values(MCP_TOOL_NAME).sort();
		expect(cardToolNames).toEqual(expectedNames);
	});

	it("declares a JSON Schema input for every tool", () => {
		for (const tool of card.tools) {
			expect(tool.inputSchema, tool.name).toBeDefined();
			expect(tool.annotations, tool.name).toBeDefined();
			expect(tool.title.length, tool.name).toBeGreaterThan(0);
			expect(tool.description.length, tool.name).toBeGreaterThan(0);
		}
	});

	it("registers the three documented prompts", () => {
		const promptNames = card.prompts.map((p) => p.name).sort();
		expect(promptNames).toEqual(["build_resume", "improve_resume", "review_resume"]);
	});

	it("publishes a resource template for resume://{id}", () => {
		const template = card.resourceTemplates.find((r) => r.name === "resume");
		expect(template?.uriTemplate).toBe("resume://{id}");
		expect(template?.mimeType).toBe("application/json");
	});

	it("includes resume and meta-schema in the static resources list", () => {
		const resourceNames = card.resources.map((r) => r.name);
		expect(resourceNames).toContain("resume");
		expect(card.resources.some((r) => r.mimeType === "application/json")).toBe(true);
	});

	it("documents an optional apiKey in the configuration schema", () => {
		const props = card.configurationSchema.properties as Record<string, unknown>;
		expect(props.apiKey).toBeDefined();
	});
});
