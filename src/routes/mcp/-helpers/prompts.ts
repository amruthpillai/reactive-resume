import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";

// ── Shared prompt helpers ────────────────────────────────────────

const resumeIdArg = z
	.string()
	.describe("The ID of the resume. Use `list_resumes` to find IDs, or `create_resume` to create a new one first.");

/** Embeds the resume data and JSON schema as context messages. */
function resumeContext(id: string) {
	return [
		{
			role: "user" as const,
			content: {
				type: "resource" as const,
				resource: {
					uri: `resume://${id}`,
					mimeType: "application/json",
					text: "Current resume data",
				},
			},
		},
		{
			role: "user" as const,
			content: {
				type: "resource" as const,
				resource: {
					uri: "resume://schema",
					mimeType: "application/json",
					text: "Resume data JSON Schema — use this to understand valid paths and types for JSON Patch operations",
				},
			},
		},
	];
}

const PATCH_REFERENCE = [
	"## JSON Patch Reference",
	"",
	"Use the `patch_resume` tool for every change. Common operations:",
	"",
	"| Action | Operation |",
	"|--------|-----------|",
	'| Change name | `{ "op": "replace", "path": "/basics/name", "value": "Jane Doe" }` |',
	'| Update headline | `{ "op": "replace", "path": "/basics/headline", "value": "Senior Engineer" }` |',
	'| Replace summary | `{ "op": "replace", "path": "/summary/content", "value": "<p>Experienced...</p>" }` |',
	'| Add experience | `{ "op": "add", "path": "/sections/experience/items/-", "value": { ...full item } }` |',
	'| Remove skill at index 2 | `{ "op": "remove", "path": "/sections/skills/items/2" }` |',
	'| Update specific field | `{ "op": "replace", "path": "/sections/experience/items/0/company", "value": "New Corp" }` |',
	'| Change template | `{ "op": "replace", "path": "/metadata/template", "value": "bronzor" }` |',
	'| Change primary color | `{ "op": "replace", "path": "/metadata/design/colors/primary", "value": "rgba(37, 99, 235, 1)" }` |',
	'| Hide a section | `{ "op": "replace", "path": "/sections/interests/hidden", "value": true }` |',
	"",
	"Rules:",
	"- New item IDs must be valid UUIDs (format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`).",
	"- HTML content fields (`description`, `summary.content`) must use valid HTML: `<p>`, `<ul>`/`<li>`, `<strong>`, `<em>`.",
	"- Every `website` field is an object: `{ url: string, label: string }`.",
	"- Use `get_resume_screenshot` after making visual changes (template, colors, layout) to verify the result.",
].join("\n");

// ── Prompt Registration ──────────────────────────────────────────

export function registerPrompts(server: McpServer) {
	// ── Build Resume ─────────────────────────────────────────────
	server.registerPrompt(
		"build_resume",
		{
			title: "Build Resume",
			description: "Guide the user step-by-step through building a resume from scratch, section by section.",
			argsSchema: { id: resumeIdArg },
		},
		async ({ id }) => ({
			messages: [
				...resumeContext(id),
				{
					role: "user" as const,
					content: {
						type: "text" as const,
						text: [
							"You are an expert resume writer. Help me build my resume step by step.",
							"",
							"## Process",
							"",
							"1. **Basics** — Ask for: full name, headline/job title, email, phone, location, website.",
							"2. **Summary** — Help me write a compelling 2-3 sentence professional summary.",
							"3. **Experience** — Walk through each role: company, position, period, key accomplishments.",
							"4. **Education** — Degree, school, graduation date, relevant coursework/honors.",
							"5. **Skills** — Categorize technical and soft skills with proficiency levels.",
							"6. **Other sections** — Projects, certifications, languages, volunteer work, etc.",
							"7. **Design** — Offer to adjust template, typography, and color scheme.",
							"",
							"For each section, ask targeted questions, draft the content, and wait for my approval before applying.",
							"Do NOT fabricate any information — only use what I provide or explicitly ask you to generate.",
							"",
							PATCH_REFERENCE,
							"",
							"The resume data and schema are attached above. Let's begin!",
						].join("\n"),
					},
				},
			],
		}),
	);

	// ── Improve Resume ───────────────────────────────────────────
	server.registerPrompt(
		"improve_resume",
		{
			title: "Improve Resume",
			description: "Review resume content and suggest concrete improvements to wording, impact, and structure.",
			argsSchema: { id: resumeIdArg },
		},
		async ({ id }) => ({
			messages: [
				...resumeContext(id),
				{
					role: "user" as const,
					content: {
						type: "text" as const,
						text: [
							"You are an expert resume writer and career coach. Review my resume and help me improve it.",
							"",
							"## Analysis Framework",
							"",
							"Go through each section and identify:",
							"- **Weak bullet points** — lacking metrics, impact, or specificity",
							"- **Passive voice** — replace with strong action verbs (Led, Built, Designed, Increased...)",
							"- **Vague descriptions** — make concrete with specific technologies, team sizes, outcomes",
							"- **Missing quantification** — add numbers, percentages, dollar amounts where possible",
							"- **Structural issues** — inconsistent formatting, poor section ordering, missing sections",
							"- **Redundancies** — repetitive content that dilutes impact",
							"",
							"## Process",
							"",
							"1. Start with an **overall assessment** (strengths + key areas to improve).",
							"2. Work through improvements **one section at a time**.",
							"3. For each suggestion, explain the **rationale** and show the before/after.",
							"4. Wait for my **approval** before applying changes via `patch_resume`.",
							"5. Do NOT fabricate information — suggest improvements based on what exists, ask me for missing details.",
							"",
							PATCH_REFERENCE,
						].join("\n"),
					},
				},
			],
		}),
	);

	// ── Tailor Resume for a Job ──────────────────────────────────
	server.registerPrompt(
		"tailor_resume",
		{
			title: "Tailor Resume for a Job",
			description:
				"Adapt a resume to match a specific job description by adjusting keywords, content, and structure for ATS optimization.",
			argsSchema: {
				id: resumeIdArg,
				job_description: z.string().min(1).describe("The full job description or posting to tailor the resume for."),
			},
		},
		async ({ id, job_description }) => ({
			messages: [
				...resumeContext(id),
				{
					role: "user" as const,
					content: {
						type: "text" as const,
						text: [
							"You are an expert resume writer specializing in ATS optimization and job targeting.",
							"",
							"## Target Job Description",
							"",
							job_description,
							"",
							"## Process",
							"",
							"1. **Gap Analysis** — Extract required skills, qualifications, keywords, and technologies from the job description. Compare against my resume and list what's aligned, what's missing, and what's irrelevant.",
							"2. **Headline & Summary** — Suggest adjustments to match the target role.",
							"3. **Experience** — Reword bullet points to highlight relevant accomplishments using keywords from the JD.",
							"4. **Skills** — Update with missing keywords that I actually possess (ask me to confirm).",
							"5. **Section Ordering** — Reorder to put the most relevant sections first.",
							"6. **De-emphasis** — Suggest hiding sections that don't add value for this specific role.",
							"",
							"Present a summary of all proposed changes before applying. Apply via `patch_resume` only after I approve.",
							"Do NOT fabricate experience or skills I don't have — only reframe existing content and ask me about gaps.",
							"",
							PATCH_REFERENCE,
						].join("\n"),
					},
				},
			],
		}),
	);

	// ── Review Resume ────────────────────────────────────────────
	server.registerPrompt(
		"review_resume",
		{
			title: "Review Resume",
			description:
				"Get a structured, professional critique with a scorecard and prioritized recommendations. Read-only — no changes are made.",
			argsSchema: { id: resumeIdArg },
		},
		async ({ id }) => ({
			messages: [
				...resumeContext(id),
				{
					role: "user" as const,
					content: {
						type: "text" as const,
						text: [
							"You are a professional resume reviewer and career advisor. Provide a thorough critique.",
							"",
							"## Evaluation Dimensions (score each 1-10)",
							"",
							"| Dimension | What to evaluate |",
							"|-----------|-----------------|",
							"| **Completeness** | Are all important sections filled in? Any critical gaps? |",
							"| **Impact** | Do bullet points demonstrate results with metrics and outcomes? |",
							"| **Clarity** | Is the writing clear, concise, and free of unnecessary jargon? |",
							"| **Formatting** | Is the layout consistent? Are sections well-organized? |",
							"| **ATS Compatibility** | Will it parse well through Applicant Tracking Systems? |",
							"| **Keywords** | Are relevant industry keywords present and naturally integrated? |",
							"| **Length** | Is the resume an appropriate length for the experience level? |",
							"",
							"## Output Format",
							"",
							"1. **Scorecard** — Score each dimension (1-10) with a brief justification.",
							"2. **Overall Score** — Weighted average of all dimensions.",
							"3. **Top 5 Recommendations** — Prioritized by impact, with specific actionable suggestions.",
							"4. **Strengths** — What's working well and should be preserved.",
							"",
							"This is a **read-only review**. Do NOT call `patch_resume` or make any changes.",
							"Format the review as a clear, structured report.",
						].join("\n"),
					},
				},
			],
		}),
	);
}
