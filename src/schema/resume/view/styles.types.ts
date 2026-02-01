/**
 * @packageDocumentation
 *
 * @remarks
 * Compile-time types for Resume view styles, inferred from the runtime schemas in
 * `styles.schema.ts`. This keeps styling contracts schema-first and prevents drift.
 *
 * @see {@link ./styles.schema | Resume Styles schemas}
 */
import type { infer as ZodInfer } from "zod";
import type {
	awardItemStylesSchema,
	baseItemStylesSchema,
	certificationItemStylesSchema,
	colorDesignSchema,
	cssSchema,
	customFieldStylesSchema,
	customSectionStylesSchema,
	designSchema,
	educationItemStylesSchema,
	experienceItemStylesSchema,
	fontWeightSchema,
	iconNameSchema,
	interestItemStylesSchema,
	itemOptionsSchema,
	languageItemStylesSchema,
	layoutSchema,
	levelDesignSchema,
	levelDesignTypeSchema,
	metadataStylesSchema,
	pageFormatSchema,
	pageLayoutSchema,
	pageSchema,
	pictureCssStylesSchema,
	pictureCustomStylesSchema,
	pictureStylesSchema,
	profileItemStylesSchema,
	projectItemStylesSchema,
	publicationItemStylesSchema,
	referenceItemStylesSchema,
	sectionStylesSchema,
	skillItemStylesSchema,
	summaryStylesSchema,
	typographyItemSchema,
	typographySchema,
	visibilityToggleSchema,
	volunteerItemStylesSchema,
} from "./styles.schema";

/**
 * @remarks Namespace grouping Resume style types.
 * @see {@link ./styles.schema | Resume Styles schemas}
 */
export namespace Resume {
	/**
	 * @remarks Types for visual styling applied to resume content.
	 */
	export namespace Styles {
		/**
		 * @remarks Icon identifier used by styled elements.
		 * @example "github-logo"
		 */
		export type IconName = ZodInfer<typeof iconNameSchema>;

		/**
		 * @remarks Visibility toggle for styled elements.
		 * @example { hidden: false }
		 */
		export type VisibilityToggle = ZodInfer<typeof visibilityToggleSchema>;

		/**
		 * @remarks Display options for list items.
		 * @example { showLinkInTitle: false }
		 */
		export type ItemOptions = ZodInfer<typeof itemOptionsSchema>;

		/**
		 * @remarks Base styling shared by list items.
		 * @example { hidden: false, options: { showLinkInTitle: false } }
		 */
		export type BaseItemStyles = ZodInfer<typeof baseItemStylesSchema>;

		/**
		 * @remarks Size and rotation styling for pictures.
		 * @example { size: 100, rotation: 0 }
		 */
		export type PictureCustomStyles = ZodInfer<typeof pictureCustomStylesSchema>;

		/**
		 * @remarks Frame and shadow styling for pictures.
		 * @example { aspectRatio: 1, borderRadius: 0, borderColor: "rgba(0,0,0,0.5)" }
		 * @example { borderWidth: 0, shadowColor: "rgba(0,0,0,0.5)", shadowWidth: 0 }
		 */
		export type PictureCssStyles = ZodInfer<typeof pictureCssStylesSchema>;

		/**
		 * @remarks Composite styling for pictures.
		 * @example { hidden: false, size: 100, rotation: 0, aspectRatio: 1 }
		 * @example { borderRadius: 0, borderColor: "rgba(0,0,0,0.5)", borderWidth: 0 }
		 * @example { shadowColor: "rgba(0,0,0,0.5)", shadowWidth: 0 }
		 */
		export type PictureStyles = ZodInfer<typeof pictureStylesSchema>;

		/**
		 * @remarks Style options for custom fields.
		 * @example { icon: "github-logo" }
		 */
		export type CustomFieldStyles = ZodInfer<typeof customFieldStylesSchema>;

		/**
		 * @remarks Style options for summary sections.
		 * @example { hidden: false, columns: 1 }
		 */
		export type SummaryStyles = ZodInfer<typeof summaryStylesSchema>;

		/**
		 * @remarks Style options for section containers.
		 * @example { hidden: false, columns: 1 }
		 */
		export type SectionStyles = ZodInfer<typeof sectionStylesSchema>;

		/**
		 * @remarks Style options for profile items.
		 * @example { hidden: false, icon: "linkedin-logo" }
		 */
		export type ProfileItemStyles = ZodInfer<typeof profileItemStylesSchema>;

		/**
		 * @remarks Style options for experience items.
		 * @example { hidden: false }
		 */
		export type ExperienceItemStyles = ZodInfer<typeof experienceItemStylesSchema>;

		/**
		 * @remarks Style options for education items.
		 * @example { hidden: false }
		 */
		export type EducationItemStyles = ZodInfer<typeof educationItemStylesSchema>;

		/**
		 * @remarks Style options for project items.
		 * @example { hidden: false }
		 */
		export type ProjectItemStyles = ZodInfer<typeof projectItemStylesSchema>;

		/**
		 * @remarks Style options for skill items.
		 * @example { hidden: false, icon: "code" }
		 */
		export type SkillItemStyles = ZodInfer<typeof skillItemStylesSchema>;

		/**
		 * @remarks Style options for language items.
		 * @example { hidden: false }
		 */
		export type LanguageItemStyles = ZodInfer<typeof languageItemStylesSchema>;

		/**
		 * @remarks Style options for interest items.
		 * @example { hidden: false, icon: "game-controller" }
		 */
		export type InterestItemStyles = ZodInfer<typeof interestItemStylesSchema>;

		/**
		 * @remarks Style options for award items.
		 * @example { hidden: false }
		 */
		export type AwardItemStyles = ZodInfer<typeof awardItemStylesSchema>;

		/**
		 * @remarks Style options for certification items.
		 * @example { hidden: false }
		 */
		export type CertificationItemStyles = ZodInfer<typeof certificationItemStylesSchema>;

		/**
		 * @remarks Style options for publication items.
		 * @example { hidden: false }
		 */
		export type PublicationItemStyles = ZodInfer<typeof publicationItemStylesSchema>;

		/**
		 * @remarks Style options for volunteer items.
		 * @example { hidden: false }
		 */
		export type VolunteerItemStyles = ZodInfer<typeof volunteerItemStylesSchema>;

		/**
		 * @remarks Style options for reference items.
		 * @example { hidden: false }
		 */
		export type ReferenceItemStyles = ZodInfer<typeof referenceItemStylesSchema>;

		/**
		 * @remarks Style options for custom sections.
		 * @example { hidden: false, columns: 1 }
		 */
		export type CustomSectionStyles = ZodInfer<typeof customSectionStylesSchema>;

		/**
		 * @remarks Page layout definition for a single page.
		 * @example { fullWidth: false, main: ["summary"], sidebar: ["profiles"] }
		 */
		export type PageLayout = ZodInfer<typeof pageLayoutSchema>;

		/**
		 * @remarks Layout definition for the resume.
		 * @example { sidebarWidth: 35, pages: [] }
		 */
		export type LayoutConfig = ZodInfer<typeof layoutSchema>;

		/**
		 * @remarks Custom CSS settings for the resume.
		 * @example { enabled: false, value: "" }
		 */
		export type CssConfig = ZodInfer<typeof cssSchema>;

		/**
		 * @remarks Page format options for rendering.
		 * @example "a4"
		 */
		export type PageFormat = ZodInfer<typeof pageFormatSchema>;

		/**
		 * @remarks Page configuration for spacing and locale.
		 * @example { gapX: 4, gapY: 8, marginX: 16, marginY: 14 }
		 * @example { format: "a4", locale: "en-US", hideIcons: false }
		 */
		export type PageConfig = ZodInfer<typeof pageSchema>;

		/**
		 * @remarks Visual type for proficiency indicators.
		 * @example "circle"
		 */
		export type LevelDesignType = ZodInfer<typeof levelDesignTypeSchema>;

		/**
		 * @remarks Level indicator styling for skills and languages.
		 * @example { icon: "star", type: "circle" }
		 */
		export type LevelDesign = ZodInfer<typeof levelDesignSchema>;

		/**
		 * @remarks Palette used by the resume design.
		 * @example { primary: "rgba(0,0,0,1)", text: "rgba(0,0,0,1)" }
		 * @example { background: "rgba(255,255,255,1)" }
		 */
		export type ColorPalette = ZodInfer<typeof colorDesignSchema>;

		/**
		 * @remarks Composite design settings for the resume.
		 * @example { level: { icon: "star", type: "circle" } }
		 * @example { colors: { primary: "rgba(0,0,0,1)", text: "rgba(0,0,0,1)" } }
		 */
		export type DesignConfig = ZodInfer<typeof designSchema>;

		/**
		 * @remarks Font weight options supported by typography.
		 * @example "400"
		 */
		export type FontWeight = ZodInfer<typeof fontWeightSchema>;

		/**
		 * @remarks Typography settings for a single text category.
		 * @example { fontFamily: "IBM Plex Serif", fontWeights: ["400"] }
		 * @example { fontSize: 11, lineHeight: 1.5 }
		 */
		export type TypographyStyle = ZodInfer<typeof typographyItemSchema>;

		/**
		 * @remarks Typography settings for body and heading text.
		 * @example { body: { fontFamily: "IBM Plex Serif", fontWeights: ["400"] } }
		 * @example { heading: { fontFamily: "Fira Sans Condensed", fontWeights: ["500"] } }
		 */
		export type TypographyConfig = ZodInfer<typeof typographySchema>;

		/**
		 * @remarks Global presentation styles applied to the resume.
		 * @example { template: "onyx", layout: { sidebarWidth: 35, pages: [] } }
		 * @example { css: { enabled: false, value: "" }, page: { format: "a4" } }
		 * @example { design: { level: { icon: "star", type: "circle" } } }
		 */
		export type MetadataStyles = ZodInfer<typeof metadataStylesSchema>;
	}
}
