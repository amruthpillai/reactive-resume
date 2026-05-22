import type { ParsedTemplate } from "@reactive-resume/schema/template-metadata";
import JSZip from "jszip";
import { parse as parseHtml } from "node-html-parser";
import nunjucks from "nunjucks";
import {
	parsedTemplateSchema,
	resumeSlotSchema,
	templateMetadataSchema,
} from "@reactive-resume/schema/template-metadata";
import { FileMapLoader } from "./loader";

export class TemplateParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TemplateParseError";
	}
}

const STANDARD_SECTION_IDS = new Set([
	"summary",
	"profiles",
	"experience",
	"education",
	"projects",
	"skills",
	"languages",
	"interests",
	"awards",
	"certifications",
	"publications",
	"volunteer",
	"references",
]);

const BINARY_EXTENSIONS = new Set([".woff2", ".woff", ".ttf", ".otf", ".png", ".jpg", ".jpeg", ".gif"]);

const extractSlots = (html: string): unknown[] => {
	const root = parseHtml(html);
	return root.querySelectorAll("resume-slot").map((el) => ({
		id: el.getAttribute("id") ?? "",
		itemType: el.getAttribute("item-type") ?? "",
		type: el.getAttribute("type") ?? "",
		label: el.getAttribute("label") ?? "",
		description: el.getAttribute("description") ?? undefined,
		required: el.getAttribute("required") === "true",
	}));
};

const MOCK_CONTEXT = {
	basics: {
		name: "Test User",
		headline: "Engineer",
		email: "t@test.com",
		phone: "",
		location: "",
		website: { url: "", label: "" },
		customFields: [],
	},
	picture: {
		hidden: true,
		url: "",
		size: 64,
		rotation: 0,
		aspectRatio: 1,
		borderRadius: 0,
		borderColor: "",
		borderWidth: 0,
		shadowColor: "",
		shadowWidth: 0,
	},
	summary: { title: "Summary", columns: 1, hidden: false, content: "<p>Test summary</p>" },
	sections: Object.fromEntries(
		[...STANDARD_SECTION_IDS].map((id) => [id, { title: id, columns: 1, hidden: false, items: [] }]),
	),
	customSections: [],
	sectionById: Object.fromEntries(
		[...STANDARD_SECTION_IDS].map((id) => [id, { title: id, columns: 1, hidden: false, items: [] }]),
	),
	metadata: {
		template: "test",
		layout: { sidebarWidth: 35, pages: [{ fullWidth: false, main: ["experience", "education"], sidebar: ["skills"] }] },
		page: { format: "a4", gapX: 4, gapY: 6, marginX: 14, marginY: 12, locale: "en-US", hideIcons: false },
		design: {
			colors: { primary: "rgba(0,0,0,1)", text: "rgba(0,0,0,1)", background: "rgba(255,255,255,1)" },
			level: { icon: "", type: "circle" },
		},
		typography: {
			body: { fontFamily: "sans-serif", fontWeights: ["400"], fontSize: 10, lineHeight: 1.5 },
			heading: { fontFamily: "sans-serif", fontWeights: ["600"], fontSize: 14, lineHeight: 1.5 },
			slots: {},
		},
		notes: "",
	},
};

export const parseTemplate = async (zipBuffer: Buffer): Promise<ParsedTemplate> => {
	let zip: JSZip;
	try {
		zip = await JSZip.loadAsync(zipBuffer);
	} catch {
		throw new TemplateParseError("File is not a valid zip archive.");
	}

	// Layer 1: structural — required files, no path traversal, allowed locations only
	if (!zip.file("template.json")) throw new TemplateParseError("Missing required file: template.json");
	if (!zip.file("index.html")) throw new TemplateParseError("Missing required file: index.html");

	const isAllowedPath = (name: string): boolean => {
		if (name === "template.json" || name === "index.html" || name === "macros.html") return true;
		const firstSlash = name.indexOf("/");
		if (firstSlash === -1) return false;
		const dir = name.slice(0, firstSlash);
		return dir === "sections" || dir === "styles" || dir === "fonts";
	};

	for (const [name, entry] of Object.entries(zip.files)) {
		if (entry.dir) continue;
		if (name.includes("..") || !isAllowedPath(name)) {
			throw new TemplateParseError(`Disallowed file path in archive: ${name}`);
		}
	}

	// Extract all files — binary extensions as base64, text files as strings
	const files: Record<string, string> = {};
	for (const [name, file] of Object.entries(zip.files)) {
		if (file.dir) continue;
		const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
		files[name] = await file.async(BINARY_EXTENSIONS.has(ext) ? "base64" : "string");
	}

	// Layer 2: schema — validate template.json
	let rawMeta: unknown;
	try {
		rawMeta = JSON.parse(files["template.json"] ?? "");
	} catch {
		throw new TemplateParseError("template.json contains invalid JSON.");
	}

	const metaResult = templateMetadataSchema.safeParse(rawMeta);
	if (!metaResult.success) {
		const err = metaResult.error.issues[0];
		throw new TemplateParseError(
			`template.json validation failed: ${err?.path.join(".") ?? "unknown"} — ${err?.message ?? "invalid"}`,
		);
	}

	// Layer 2: validate bundled font files exist in archive
	for (const font of metaResult.data.fonts) {
		if (font.source === "bundled") {
			for (const [weight, path] of Object.entries(font.files ?? {})) {
				if (!(path in files)) {
					throw new TemplateParseError(
						`Font file missing: ${font.family} weight ${weight} declared at "${path}" not found in archive`,
					);
				}
			}
		}
	}

	// Layer 2: extract and individually validate resume-slot tags
	const validatedSlots: Array<ReturnType<typeof resumeSlotSchema.parse>> = [];
	for (const [name, content] of Object.entries(files)) {
		if (!name.endsWith(".html")) continue;
		for (const rawSlot of extractSlots(content)) {
			const parsed = resumeSlotSchema.safeParse(rawSlot);
			if (!parsed.success) {
				const err = parsed.error.issues[0];
				throw new TemplateParseError(
					`Invalid resume-slot in ${name}: ${err?.path.join(".") ?? "unknown"} — ${err?.message ?? "invalid"}`,
				);
			}
			validatedSlots.push(parsed.data);
		}
	}

	const parsedResult = parsedTemplateSchema.safeParse({ metadata: metaResult.data, inputs: validatedSlots, files });
	if (!parsedResult.success) {
		const err = parsedResult.error.issues[0];
		throw new TemplateParseError(
			`Template validation failed: ${err?.path.join(".") ?? "unknown"} — ${err?.message ?? "invalid"}`,
		);
	}

	// Layer 3: syntactic — each HTML file must compile as valid Nunjucks
	const env = new nunjucks.Environment(new FileMapLoader(files) as nunjucks.ILoader, { autoescape: false });
	for (const [name, content] of Object.entries(files)) {
		if (!name.endsWith(".html")) continue;
		try {
			nunjucks.compile(content, env);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			throw new TemplateParseError(`Nunjucks syntax error in ${name}: ${msg}`);
		}
	}

	// Layer 6: security — block <script> tags before executing any content
	for (const [name, content] of Object.entries(files)) {
		if (!name.endsWith(".html")) continue;
		if (/<script[\s>]/i.test(content)) {
			throw new TemplateParseError(`Security: <script> tags are not allowed (found in ${name})`);
		}
	}

	// Layer 5: runtime — dry-run render must complete without throwing
	try {
		env.render("index.html", MOCK_CONTEXT);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		throw new TemplateParseError(`Template dry-run render failed: ${msg}`);
	}

	// Warnings — non-blocking
	const warnings: Array<{ type: string; message: string }> = [];

	if (parsedResult.data.metadata.sidebarPosition !== "none") {
		const allHtml = Object.entries(files)
			.filter(([n]) => n.endsWith(".html"))
			.map(([, c]) => c)
			.join("\n");
		if (!allHtml.includes("page.sidebar")) {
			warnings.push({
				type: "sidebar-not-rendered",
				message: `sidebarPosition is "${parsedResult.data.metadata.sidebarPosition}" but no file references page.sidebar`,
			});
		}
	}

	const sectionFiles = new Set(
		Object.keys(files)
			.filter((n) => n.startsWith("sections/") && n.endsWith(".html"))
			.map((n) => n.slice("sections/".length, -".html".length)),
	);
	if (!sectionFiles.has("default")) {
		for (const sectionId of STANDARD_SECTION_IDS) {
			if (!sectionFiles.has(sectionId)) {
				warnings.push({
					type: "section-not-implemented",
					message: `Section "${sectionId}" has no implementation file and no sections/default.html fallback`,
				});
			}
		}
	}

	return { ...parsedResult.data, warnings };
};
