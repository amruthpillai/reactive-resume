import z from "zod";
import { templateSchema } from "./templates";

// ─── Node style ──────────────────────────────────────────────────────────────
//
// Style properties available on every node. Mirrors the subset of CSS that
// translates cleanly to @react-pdf primitives.

export const nodeStyleSchema = z
	.object({
		// Spacing
		padding: z.number().optional(),
		paddingTop: z.number().optional(),
		paddingRight: z.number().optional(),
		paddingBottom: z.number().optional(),
		paddingLeft: z.number().optional(),
		margin: z.number().optional(),
		marginTop: z.number().optional(),
		marginRight: z.number().optional(),
		marginBottom: z.number().optional(),
		marginLeft: z.number().optional(),
		// Colors
		backgroundColor: z.string().optional(),
		textColor: z.string().optional(),
		// Border
		borderRadius: z.number().optional(),
		borderWidth: z.number().optional(),
		borderColor: z.string().optional(),
		// Typography
		fontSize: z.number().optional(),
		fontWeight: z.enum(["400", "500", "600", "700"]).optional(),
		textAlign: z.enum(["left", "center", "right"]).optional(),
		// Layout
		alignItems: z.enum(["flex-start", "center", "flex-end"]).optional(),
		justifyContent: z.enum(["flex-start", "center", "flex-end", "space-between"]).optional(),
	})
	.optional();

export type NodeStyle = z.infer<typeof nodeStyleSchema>;

// ─── Node types ──────────────────────────────────────────────────────────────

export const templateNodeTypeSchema = z.enum([
	// Layout
	"container",
	"columns",
	"spacer",
	"page-break",
	// Header placeholders (single-field bits)
	"placeholder.name",
	"placeholder.headline",
	"placeholder.picture",
	"placeholder.contact",
	// Section placeholders (multi-item lists from resume data)
	"placeholder.summary",
	"placeholder.profiles",
	"placeholder.experience",
	"placeholder.education",
	"placeholder.projects",
	"placeholder.skills",
	"placeholder.languages",
	"placeholder.interests",
	"placeholder.awards",
	"placeholder.certifications",
	"placeholder.publications",
	"placeholder.volunteer",
	"placeholder.references",
]);

export type TemplateNodeType = z.infer<typeof templateNodeTypeSchema>;

// ─── Node tree ───────────────────────────────────────────────────────────────

export type TemplateNode = {
	id: string;
	type: TemplateNodeType;
	children?: TemplateNode[] | undefined;
	style?: NodeStyle | undefined;
	props?:
		| {
				// columns
				columnCount?: 2 | 3 | 4;
				columnWidths?: number[];
				gap?: number;
				// spacer
				height?: number;
				// picture
				pictureSize?: number;
				pictureBorderRadius?: number;
				pictureAlign?: "left" | "center" | "right";
				// section heading control
				showHeading?: boolean;
				[key: string]: unknown;
		  }
		| undefined;
};

export const templateNodeSchema: z.ZodType<TemplateNode> = z.lazy(() =>
	z.object({
		id: z.string(),
		type: templateNodeTypeSchema,
		children: z.array(templateNodeSchema).optional(),
		style: nodeStyleSchema,
		props: z.record(z.string(), z.unknown()).optional(),
	}),
);

// ─── Template-level page settings ────────────────────────────────────────────

export const templatePageSettingsSchema = z
	.object({
		paddingHorizontal: z.number().optional(),
		paddingVertical: z.number().optional(),
		backgroundColor: z.string().optional(),
		primaryColor: z.string().optional(),
		textColor: z.string().optional(),
	})
	.optional();

export type TemplatePageSettings = z.infer<typeof templatePageSettingsSchema>;

// ─── Custom template data ───────────────────────────────────────────────────

export const customTemplateDataSchema = z.object({
	baseTemplate: templateSchema,
	nodes: z.array(templateNodeSchema),
	page: templatePageSettingsSchema,
});

export type CustomTemplateData = z.infer<typeof customTemplateDataSchema>;

// ─── Defaults seeded per base template ───────────────────────────────────────

type TemplateSidebarPosition = "left" | "right" | "none";

const TEMPLATE_SIDEBAR_POSITIONS: Record<string, TemplateSidebarPosition> = {
	azurill: "left",
	bronzor: "none",
	chikorita: "right",
	ditgar: "left",
	ditto: "left",
	gengar: "left",
	glalie: "left",
	kakuna: "none",
	lapras: "none",
	leafish: "right",
	meowth: "none",
	onyx: "none",
	pikachu: "left",
	rhyhorn: "none",
	scizor: "none",
};

function mkId(): string {
	return crypto.randomUUID();
}

function n(
	type: TemplateNodeType,
	opts?: { style?: NodeStyle; props?: TemplateNode["props"]; children?: TemplateNode[] },
): TemplateNode {
	const node: TemplateNode = { id: mkId(), type };
	if (opts?.style) node.style = opts.style;
	if (opts?.props) node.props = opts.props;
	if (opts?.children) node.children = opts.children;
	return node;
}

// Section placeholders, in a sensible default reading order. Mirrors what a
// built-in template would show so an unmodified custom template includes the
// same sections as its base.
const MAIN_SECTIONS: TemplateNodeType[] = [
	"placeholder.summary",
	"placeholder.experience",
	"placeholder.education",
	"placeholder.projects",
	"placeholder.awards",
	"placeholder.certifications",
	"placeholder.publications",
	"placeholder.volunteer",
	"placeholder.references",
];

const SIDEBAR_SECTIONS: TemplateNodeType[] = [
	"placeholder.profiles",
	"placeholder.skills",
	"placeholder.languages",
	"placeholder.interests",
];

const ALL_SECTIONS: TemplateNodeType[] = [
	"placeholder.summary",
	"placeholder.experience",
	"placeholder.education",
	"placeholder.projects",
	"placeholder.skills",
	"placeholder.languages",
	"placeholder.interests",
	"placeholder.awards",
	"placeholder.certifications",
	"placeholder.publications",
	"placeholder.volunteer",
	"placeholder.references",
	"placeholder.profiles",
];

const sectionNodes = (types: TemplateNodeType[]): TemplateNode[] => types.map((type) => n(type));

// Header keeps no padding of its own so the base template's page spacing drives
// the layout; items are stacked with small top margins (the node model has no
// gap), centered to match the common header style.
const headerNode = (): TemplateNode =>
	n("container", {
		style: { alignItems: "center", paddingBottom: 8 },
		children: [
			n("placeholder.picture", { props: { pictureSize: 80, pictureBorderRadius: 50 } }),
			n("placeholder.name", { style: { marginTop: 6, textAlign: "center" } }),
			n("placeholder.headline", { style: { marginTop: 2, textAlign: "center" } }),
			n("placeholder.contact", { style: { marginTop: 6 } }),
		],
	});

function defaultNodes(baseTemplate: string): TemplateNode[] {
	const position = TEMPLATE_SIDEBAR_POSITIONS[baseTemplate] ?? "none";
	const header = headerNode();

	if (position === "left") {
		return [
			header,
			n("columns", {
				props: { columnCount: 2, columnWidths: [35, 65], gap: 16 },
				children: [
					n("container", { children: sectionNodes(SIDEBAR_SECTIONS) }),
					n("container", { children: sectionNodes(MAIN_SECTIONS) }),
				],
			}),
		];
	}

	if (position === "right") {
		return [
			header,
			n("columns", {
				props: { columnCount: 2, columnWidths: [65, 35], gap: 16 },
				children: [
					n("container", { children: sectionNodes(MAIN_SECTIONS) }),
					n("container", { children: sectionNodes(SIDEBAR_SECTIONS) }),
				],
			}),
		];
	}

	return [header, ...sectionNodes(ALL_SECTIONS)];
}

export const defaultCustomTemplateData = (baseTemplate = "azurill"): CustomTemplateData => ({
	baseTemplate: baseTemplate as CustomTemplateData["baseTemplate"],
	nodes: defaultNodes(baseTemplate),
	// Empty page settings: inherit the base template's padding/colours until the
	// user overrides them in the editor.
	page: {},
});

// A blank canvas: no seeded nodes. The base template still drives styling
// (fonts, section/heading styles, colours); the user builds the layout from
// scratch by dragging components.
export const blankCustomTemplateData = (baseTemplate = "azurill"): CustomTemplateData => ({
	baseTemplate: baseTemplate as CustomTemplateData["baseTemplate"],
	nodes: [],
	page: {},
});
