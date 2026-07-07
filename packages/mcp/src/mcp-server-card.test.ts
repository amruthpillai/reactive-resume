import { describe, expect, it } from "vitest";
import { buildMcpServerCard } from "./mcp-server-card";
import { MCP_TOOL_NAME } from "./mcp-tool-names";
import { TOOL_META } from "./tool-meta";

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

	it("advertises a short-lived PDF download URL tool", () => {
		const tool = card.tools.find((item) => item.name === "download_resume_pdf");

		expect(tool?.title).toBe("Download Resume PDF");
		expect(tool?.description).toContain("short-lived");
		expect(tool?.description).toContain("10 minutes");
		expect(tool?.annotations?.readOnlyHint).toBe(true);
	});

	it("advertises application tracker tools", () => {
		const names = card.tools.map((tool) => tool.name);

		expect(names).toContain("list_applications");
		expect(names).toContain("create_application");
		expect(names).toContain("attach_application_document");
		expect(names).toContain("tailor_resume_for_application");
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

	it("matches the create/update application archived contract", () => {
		const create = TOOL_META[MCP_TOOL_NAME.createApplication].inputSchema;
		const update = TOOL_META[MCP_TOOL_NAME.updateApplication].inputSchema;

		expect(create.safeParse({ company: "Acme", role: "Engineer", archived: true }).success).toBe(false);
		expect(update.safeParse({ id: "app-1", archived: true }).success).toBe(true);
	});

	it("accepts only http/https application source URLs", () => {
		const create = TOOL_META[MCP_TOOL_NAME.createApplication].inputSchema;
		const autofill = TOOL_META[MCP_TOOL_NAME.autofillApplicationFromJob].inputSchema;

		expect(create.safeParse({ company: "Acme", role: "Engineer", sourceUrl: "https://example.com/job" }).success).toBe(
			true,
		);
		expect(autofill.safeParse({ sourceUrl: "http://example.com/job" }).success).toBe(true);
		expect(create.safeParse({ company: "Acme", role: "Engineer", sourceUrl: "ftp://example.com/job" }).success).toBe(
			false,
		);
		expect(autofill.safeParse({ sourceUrl: "javascript:alert(1)" }).success).toBe(false);
	});

	it("rejects application document payloads above 10MB decoded", () => {
		const schema = TOOL_META[MCP_TOOL_NAME.attachApplicationDocument].inputSchema;
		const tooLargePdf = Buffer.alloc(10 * 1024 * 1024 + 1, 0).toString("base64");

		expect(
			schema.safeParse({
				id: "app-1",
				kind: "resume",
				fileName: "resume.pdf",
				contentType: "application/pdf",
				dataBase64: tooLargePdf,
			}).success,
		).toBe(false);
	});
});
