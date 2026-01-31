/**
 * @packageDocumentation
 *
 * @remarks
 * Replace-style DraftResume operation schemas. These operations swap entire
 * top-level blocks, preserving a clear "replace" intent for batch processing.
 *
 * @see {@link ./operations.schema | DraftResume operation schema}
 */
import z from "zod";
import {
	awardsSectionDataSchema,
	basicsDataSchema,
	certificationsSectionDataSchema,
	customSectionDataSchema,
	educationSectionDataSchema,
	experienceSectionDataSchema,
	interestsSectionDataSchema,
	languagesSectionDataSchema,
	metadataDataSchema,
	pictureDataSchema,
	profilesSectionDataSchema,
	projectsSectionDataSchema,
	publicationsSectionDataSchema,
	referencesSectionDataSchema,
	sectionTypeSchema,
	skillsSectionDataSchema,
	summaryDataSchema,
	volunteerSectionDataSchema,
} from "../data/data.schema";

/**
 * @remarks Accepts any supported section payload for replace operations.
 * @example { title: "Experience", items: [] }
 */
export const sectionDataSchema = z.union([
	profilesSectionDataSchema,
	experienceSectionDataSchema,
	educationSectionDataSchema,
	projectsSectionDataSchema,
	skillsSectionDataSchema,
	languagesSectionDataSchema,
	interestsSectionDataSchema,
	awardsSectionDataSchema,
	certificationsSectionDataSchema,
	publicationsSectionDataSchema,
	volunteerSectionDataSchema,
	referencesSectionDataSchema,
]);

/**
 * @remarks Replace the picture payload on the draft.
 * @example { op: "replacePicture", data: { url: "" } }
 */
export const replacePictureOperationSchema = z.object({
	op: z.literal("replacePicture"),
	data: pictureDataSchema,
});

/**
 * @remarks Replace the basics payload on the draft.
 * @example { op: "replaceBasics", data: { name: "", headline: "", email: "", phone: "", location: "", website: { label: "", url: "" }, customFields: [] } }
 */
export const replaceBasicsOperationSchema = z.object({
	op: z.literal("replaceBasics"),
	data: basicsDataSchema,
});

/**
 * @remarks Replace the summary payload on the draft.
 * @example { op: "replaceSummary", data: { title: "", content: "" } }
 */
export const replaceSummaryOperationSchema = z.object({
	op: z.literal("replaceSummary"),
	data: summaryDataSchema,
});

/**
 * @remarks Replace the metadata payload on the draft.
 * @example { op: "replaceMetadata", data: { notes: "" } }
 */
export const replaceMetadataOperationSchema = z.object({
	op: z.literal("replaceMetadata"),
	data: metadataDataSchema,
});

/**
 * @remarks Replace a built-in section payload on the draft.
 * @example { op: "replaceSection", section: "experience", data: { title: "", items: [] } }
 */
export const replaceSectionOperationSchema = z.object({
	op: z.literal("replaceSection"),
	section: sectionTypeSchema,
	data: sectionDataSchema,
});

/**
 * @remarks Replace the custom sections payload on the draft.
 * @example { op: "replaceCustomSections", data: [] }
 */
export const replaceCustomSectionsOperationSchema = z.object({
	op: z.literal("replaceCustomSections"),
	data: z.array(customSectionDataSchema),
});
