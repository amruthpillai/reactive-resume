import z from "zod";
import { templateSchema } from "./templates";

export const placeholderTypeSchema = z.enum([
	"name",
	"headline",
	"picture",
	"contact",
	"summary",
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
	"profiles",
]);

export type PlaceholderType = z.infer<typeof placeholderTypeSchema>;

export const templateNodeTypeSchema = z.enum([
	"container",
	"columns",
	"spacer",
	"page-break",
	"placeholder.name",
	"placeholder.headline",
	"placeholder.picture",
	"placeholder.contact",
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
]);

export type TemplateNodeType = z.infer<typeof templateNodeTypeSchema>;

export type TemplateNode = {
	id: string;
	type: TemplateNodeType;
	children?: TemplateNode[];
	props: {
		// container
		backgroundColor?: string;
		padding?: number;
		// columns
		columnCount?: 2 | 3 | 4;
		columnWidths?: number[];
		gap?: number;
		// spacer
		height?: number;
		// picture
		size?: number;
		borderRadius?: number;
		[key: string]: unknown;
	};
};

export const templateNodeSchema: z.ZodType<TemplateNode> = z.lazy(() =>
	z.object({
		id: z.string(),
		type: templateNodeTypeSchema,
		children: z.array(templateNodeSchema).optional(),
		props: z.record(z.string(), z.unknown()),
	}),
);

export const customTemplateDataSchema = z.object({
	baseTemplate: templateSchema,
	nodes: z.array(templateNodeSchema),
});

export type CustomTemplateData = z.infer<typeof customTemplateDataSchema>;

export const defaultCustomTemplateData = (baseTemplate = "azurill"): CustomTemplateData => ({
	baseTemplate: baseTemplate as CustomTemplateData["baseTemplate"],
	nodes: [],
});
