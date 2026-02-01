/**
 * @packageDocumentation
 *
 * @remarks
 * Runtime validation schemas for Resume view styles. These schemas model visual
 * configuration that complements DraftResume data without embedding content itself.
 *
 * The intent is to keep view styling orthogonal to draft content while providing
 * a well-defined runtime contract for display-oriented settings.
 *
 * @see {@link ./styles.types | Resume Styles types}
 */
import z from "zod";
import { templateSchema } from "@/schema/templates";

/**
 * @remarks Accepts icon identifiers used by the resume templates.
 * @example "github-logo"
 */
export const iconNameSchema = z
	.string()
	.describe("Icon identifier for visual embellishment. Use an empty string to hide the icon when unsure.");

/**
 * @remarks Controls visibility of a styled element without deleting its data.
 * @example { hidden: false }
 */
export const visibilityToggleSchema = z.object({
	hidden: z.boolean().describe("Whether the element should be visually hidden."),
});

/**
 * @remarks Display options that influence how item content is rendered.
 * @example { showLinkInTitle: false }
 */
export const itemOptionsSchema = z
	.object({
		showLinkInTitle: z
			.boolean()
			.catch(false)
			.describe("If true, the website URL is rendered as a hyperlink on the title."),
	})
	.catch({ showLinkInTitle: false });

/**
 * @remarks Base styles shared by all list items.
 * @example { hidden: false, options: { showLinkInTitle: false } }
 */
export const baseItemStylesSchema = visibilityToggleSchema.extend({
	options: itemOptionsSchema.optional().describe("Optional display options for the item."),
});

/**
 * @remarks Size and rotation styles for profile pictures.
 * @example { size: 100, rotation: 0 }
 */
export const pictureCustomStylesSchema = z.object({
	size: z.number().min(32).max(512).describe("Picture size in points (pt)."),
	rotation: z.number().min(0).max(360).describe("Picture rotation in degrees."),
});

/**
 * @remarks CSS-like styles that affect picture framing.
 * @example { aspectRatio: 1, borderRadius: 0, borderColor: "rgba(0,0,0,0.5)" }
 * @example { borderWidth: 0, shadowColor: "rgba(0,0,0,0.5)", shadowWidth: 0 }
 */
export const pictureCssStylesSchema = z.object({
	aspectRatio: z.number().min(0.5).max(2.5).describe("Aspect ratio as width / height."),
	borderRadius: z.number().min(0).max(100).describe("Border radius in points (pt)."),
	borderColor: z.string().describe("Border color as rgba(r, g, b, a)."),
	borderWidth: z.number().min(0).describe("Border width in points (pt)."),
	shadowColor: z.string().describe("Shadow color as rgba(r, g, b, a)."),
	shadowWidth: z.number().min(0).describe("Shadow width in points (pt)."),
});

/**
 * @remarks Composite picture styles including visibility and frame details.
 * @example { hidden: false, size: 100, rotation: 0, aspectRatio: 1 }
 * @example { borderRadius: 0, borderColor: "rgba(0,0,0,0.5)", borderWidth: 0 }
 * @example { shadowColor: "rgba(0,0,0,0.5)", shadowWidth: 0 }
 */
export const pictureStylesSchema = visibilityToggleSchema
	.merge(pictureCustomStylesSchema)
	.merge(pictureCssStylesSchema);

/**
 * @remarks Style options for custom fields in the basics section.
 * @example { icon: "github-logo" }
 */
export const customFieldStylesSchema = z.object({
	icon: iconNameSchema.describe("Icon to display alongside the custom field."),
});

/**
 * @remarks Style options for the summary section.
 * @example { hidden: false, columns: 1 }
 */
export const summaryStylesSchema = visibilityToggleSchema.extend({
	columns: z.number().describe("Number of columns the summary spans."),
});

/**
 * @remarks Style options shared by section containers.
 * @example { hidden: false, columns: 1 }
 */
export const sectionStylesSchema = visibilityToggleSchema.extend({
	columns: z.number().describe("Number of columns the section spans."),
});

/**
 * @remarks Style options for icon-bearing list items.
 * @example { hidden: false, icon: "github-logo" }
 */
const iconItemStylesSchema = baseItemStylesSchema.extend({
	icon: iconNameSchema.describe("Icon to display alongside the item."),
});

/**
 * @remarks Style options for profile items.
 * @example { hidden: false, icon: "linkedin-logo" }
 */
export const profileItemStylesSchema = iconItemStylesSchema.describe("Styles for profile list items.");

/**
 * @remarks Style options for experience items.
 * @example { hidden: false }
 */
export const experienceItemStylesSchema = baseItemStylesSchema.describe("Styles for experience list items.");

/**
 * @remarks Style options for education items.
 * @example { hidden: false }
 */
export const educationItemStylesSchema = baseItemStylesSchema.describe("Styles for education list items.");

/**
 * @remarks Style options for project items.
 * @example { hidden: false }
 */
export const projectItemStylesSchema = baseItemStylesSchema.describe("Styles for project list items.");

/**
 * @remarks Style options for skill items.
 * @example { hidden: false, icon: "code" }
 */
export const skillItemStylesSchema = iconItemStylesSchema.describe("Styles for skill list items.");

/**
 * @remarks Style options for language items.
 * @example { hidden: false }
 */
export const languageItemStylesSchema = baseItemStylesSchema.describe("Styles for language list items.");

/**
 * @remarks Style options for interest items.
 * @example { hidden: false, icon: "game-controller" }
 */
export const interestItemStylesSchema = iconItemStylesSchema.describe("Styles for interest list items.");

/**
 * @remarks Style options for award items.
 * @example { hidden: false }
 */
export const awardItemStylesSchema = baseItemStylesSchema.describe("Styles for award list items.");

/**
 * @remarks Style options for certification items.
 * @example { hidden: false }
 */
export const certificationItemStylesSchema = baseItemStylesSchema.describe("Styles for certification list items.");

/**
 * @remarks Style options for publication items.
 * @example { hidden: false }
 */
export const publicationItemStylesSchema = baseItemStylesSchema.describe("Styles for publication list items.");

/**
 * @remarks Style options for volunteer items.
 * @example { hidden: false }
 */
export const volunteerItemStylesSchema = baseItemStylesSchema.describe("Styles for volunteer list items.");

/**
 * @remarks Style options for reference items.
 * @example { hidden: false }
 */
export const referenceItemStylesSchema = baseItemStylesSchema.describe("Styles for reference list items.");

/**
 * @remarks Style options for custom sections, aligned with base section styles.
 * @example { hidden: false, columns: 1 }
 */
export const customSectionStylesSchema = sectionStylesSchema.describe("Styles for custom sections.");

/**
 * @remarks Layout structure for a single resume page.
 * @example { fullWidth: false, main: ["summary"], sidebar: ["profiles"] }
 */
export const pageLayoutSchema = z.object({
	fullWidth: z.boolean().describe("Whether the main column should span full width on the page."),
	main: z.array(z.string()).describe("Section identifiers placed in the main column."),
	sidebar: z.array(z.string()).describe("Section identifiers placed in the sidebar column."),
});

/**
 * @remarks Layout settings for arranging pages and sidebar width.
 * @example { sidebarWidth: 35, pages: [] }
 */
export const layoutSchema = z.object({
	sidebarWidth: z.number().min(10).max(50).catch(35).describe("Sidebar width as a percentage of the page."),
	pages: z.array(pageLayoutSchema).describe("Ordered list of page layouts."),
});

/**
 * @remarks Custom CSS settings applied to the rendered resume.
 * @example { enabled: false, value: "" }
 */
export const cssSchema = z.object({
	enabled: z.boolean().describe("Whether custom CSS is enabled."),
	value: z.string().describe("Raw CSS string applied to the resume."),
});

/**
 * @remarks Supported page formats for rendering.
 * @example "a4"
 */
export const pageFormatSchema = z.enum(["a4", "letter", "free-form"]);

/**
 * @remarks Pagination and margin settings for the resume.
 * @example { gapX: 4, gapY: 8, marginX: 16, marginY: 14 }
 * @example { format: "a4", locale: "en-US", hideIcons: false }
 */
export const pageSchema = z.object({
	gapX: z.number().min(0).describe("Horizontal gap between sections in points (pt)."),
	gapY: z.number().min(0).describe("Vertical gap between sections in points (pt)."),
	marginX: z.number().min(0).describe("Horizontal margin in points (pt)."),
	marginY: z.number().min(0).describe("Vertical margin in points (pt)."),
	format: pageFormatSchema.catch("a4").describe("Page format identifier."),
	locale: z.string().catch("en-US").describe("Locale used for translated headings."),
	hideIcons: z.boolean().catch(false).describe("Whether section icons should be hidden."),
});

/**
 * @remarks Supported visualization styles for proficiency levels.
 * @example "circle"
 */
export const levelDesignTypeSchema = z.enum([
	"hidden",
	"circle",
	"square",
	"rectangle",
	"rectangle-full",
	"progress-bar",
	"icon",
]);

/**
 * @remarks Level design configuration for proficiency indicators.
 * @example { icon: "star", type: "circle" }
 */
export const levelDesignSchema = z.object({
	icon: iconNameSchema.describe("Icon used when the level design type is icon."),
	type: levelDesignTypeSchema.describe("Shape used for proficiency indicators."),
});

/**
 * @remarks Color palette used by the resume theme.
 * @example { primary: "rgba(0, 132, 209, 1)", text: "rgba(0, 0, 0, 1)" }
 * @example { background: "rgba(255, 255, 255, 1)" }
 */
export const colorDesignSchema = z.object({
	primary: z.string().describe("Primary theme color as rgba(r, g, b, a)."),
	text: z.string().describe("Text color as rgba(r, g, b, a)."),
	background: z.string().describe("Background color as rgba(r, g, b, a)."),
});

/**
 * @remarks Visual design configuration for levels and palette.
 * @example { level: { icon: "star", type: "circle" } }
 * @example { colors: { primary: "rgba(0,0,0,1)", text: "rgba(0,0,0,1)" } }
 */
export const designSchema = z.object({
	level: levelDesignSchema,
	colors: colorDesignSchema,
});

/**
 * @remarks Supported font weight values for typography.
 * @example "400"
 */
export const fontWeightSchema = z.enum(["100", "200", "300", "400", "500", "600", "700", "800", "900"]);

/**
 * @remarks Typography definition for a single text category.
 * @example { fontFamily: "IBM Plex Serif", fontWeights: ["400"] }
 * @example { fontSize: 11, lineHeight: 1.5 }
 */
export const typographyItemSchema = z.object({
	fontFamily: z.string().describe("Font family name used for rendering."),
	fontWeights: z.array(fontWeightSchema).catch(["400"]).describe("Font weights available for the family."),
	fontSize: z.number().min(6).max(24).catch(11).describe("Font size in points (pt)."),
	lineHeight: z.number().min(0.5).max(4).catch(1.5).describe("Line height as a multiplier of font size."),
});

/**
 * @remarks Typography configuration for headings and body text.
 * @example { body: { fontFamily: "IBM Plex Serif", fontWeights: ["400"] } }
 * @example { heading: { fontFamily: "Fira Sans Condensed", fontWeights: ["500"] } }
 */
export const typographySchema = z.object({
	body: typographyItemSchema.describe("Typography for body copy."),
	heading: typographyItemSchema.describe("Typography for headings."),
});

/**
 * @remarks Metadata styles that control global resume presentation.
 * @example { template: "onyx", layout: { sidebarWidth: 35, pages: [] } }
 * @example { css: { enabled: false, value: "" }, page: { format: "a4" } }
 * @example { design: { level: { icon: "star", type: "circle" } } }
 */
export const metadataStylesSchema = z.object({
	template: templateSchema.catch("onyx").describe("Template selection driving overall resume layout."),
	layout: layoutSchema.describe("Page layout configuration."),
	css: cssSchema.describe("Custom CSS settings."),
	page: pageSchema.describe("Page formatting configuration."),
	design: designSchema.describe("Design palette and level indicators."),
	typography: typographySchema.describe("Typography configuration for headings and body text."),
});
