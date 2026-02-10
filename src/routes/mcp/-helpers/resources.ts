import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { client } from "@/integrations/orpc/client";
import schemaJSON from "@/schema/schema.json";

export function registerResources(server: McpServer) {
	// ── Resource: resume://{id} ──────────────────────────────────
	// Dynamic resource that exposes each resume's full data as JSON.
	// Clients can list all available resumes and read individual ones by ID.
	const resumeTemplate = new ResourceTemplate("resume://{id}", {
		list: async () => {
			const resumes = await client.resume.list();

			return {
				resources: resumes.map(({ id, name, slug, tags, isPublic, isLocked, updatedAt }) => ({
					name,
					title: `${name} (${slug})`,
					uri: `resume://${id}`,
					mimeType: "application/json" as const,
					description: [
						isPublic ? "Public" : "Private",
						isLocked ? "Locked" : null,
						tags.length > 0 ? `Tags: ${tags.join(", ")}` : null,
					]
						.filter(Boolean)
						.join(" | "),
					annotations: {
						lastModified: updatedAt.toISOString(),
					},
				})),
			};
		},
	});

	server.registerResource(
		"resume",
		resumeTemplate,
		{
			title: "Resume Data",
			mimeType: "application/json",
			description: [
				"Full resume data as JSON, including basics, summary, sections, custom sections, and metadata.",
				"Use resume://{id} with an ID from list_resumes.",
				"This is also embedded as context in all MCP prompts (build_resume, improve_resume, etc.).",
			].join(" "),
		},
		async (uri: URL) => {
			const id = uri.href.replace(/^resume:\/\//, "");
			if (!id) throw new Error("Invalid resume URI — expected format: resume://{id}");

			const resume = await client.resume.getById({ id });

			return {
				contents: [
					{
						uri: uri.href,
						mimeType: "application/json" as const,
						text: JSON.stringify(resume.data, null, 2),
					},
				],
			};
		},
	);

	// ── Resource: resume://schema ────────────────────────────────
	// Static resource containing the JSON Schema for resume data.
	// LLMs should reference this when generating JSON Patch operations
	// to ensure paths and values conform to the expected structure.
	server.registerResource(
		"resume-schema",
		"resume://schema",
		{
			title: "Resume Data JSON Schema",
			mimeType: "application/json",
			description: [
				"The JSON Schema describing the complete resume data structure.",
				"Reference this when generating JSON Patch operations to ensure paths and value types are valid.",
				"Covers: basics, summary, picture, sections (experience, education, skills, etc.),",
				"custom sections, and metadata (template, layout, typography, colors, CSS).",
			].join(" "),
		},
		async (uri: URL) => ({
			contents: [
				{
					uri: uri.href,
					mimeType: "application/json" as const,
					text: JSON.stringify(schemaJSON, null, 2),
				},
			],
		}),
	);
}
