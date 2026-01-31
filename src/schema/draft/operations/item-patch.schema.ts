/**
 * @packageDocumentation
 *
 * @remarks
 * Patch-style DraftResume operation schemas. These operations support partial,
 * item-level and field-level updates while preserving schema validation.
 *
 * @see {@link ./operations.schema | DraftResume operation schema}
 */
import z from "zod";
import {
	awardItemDataSchema,
	certificationItemDataSchema,
	customFieldDataSchema,
	educationItemDataSchema,
	experienceItemDataSchema,
	interestItemDataSchema,
	languageItemDataSchema,
	listItemDataSchema,
	profileItemDataSchema,
	projectItemDataSchema,
	publicationItemDataSchema,
	referenceItemDataSchema,
	sectionTypeSchema,
	skillItemDataSchema,
	urlValueSchema,
	volunteerItemDataSchema,
} from "../data/data.schema";

/**
 * @remarks Builds a partial item schema while keeping stable identifiers required.
 * @param itemSchema - The schema for the full item shape.
 * @returns A schema that requires `id` while allowing partial updates of other fields.
 */
const createItemPatchSchema = <TItemSchema extends z.ZodObject<any>>(itemSchema: TItemSchema) =>
	listItemDataSchema.and(itemSchema.partial());

/**
 * @remarks Validates partial updates to custom field entries.
 * @example { id: "custom-field-1", text: "Open to relocation" }
 */
const customFieldPatchSchema = createItemPatchSchema(customFieldDataSchema);

/**
 * @remarks Validates partial updates to profile items.
 * @example { id: "profile-1", network: "GitHub" }
 */
const profileItemPatchSchema = createItemPatchSchema(profileItemDataSchema);

/**
 * @remarks Validates partial updates to experience items.
 * @example { id: "experience-1", company: "Analytical Engine" }
 */
const experienceItemPatchSchema = createItemPatchSchema(experienceItemDataSchema);

/**
 * @remarks Validates partial updates to education items.
 * @example { id: "education-1", school: "University of London" }
 */
const educationItemPatchSchema = createItemPatchSchema(educationItemDataSchema);

/**
 * @remarks Validates partial updates to project items.
 * @example { id: "project-1", name: "Notes on the Analytical Engine" }
 */
const projectItemPatchSchema = createItemPatchSchema(projectItemDataSchema);

/**
 * @remarks Validates partial updates to skill items.
 * @example { id: "skill-1", name: "Mathematics" }
 */
const skillItemPatchSchema = createItemPatchSchema(skillItemDataSchema);

/**
 * @remarks Validates partial updates to language items.
 * @example { id: "language-1", language: "English" }
 */
const languageItemPatchSchema = createItemPatchSchema(languageItemDataSchema);

/**
 * @remarks Validates partial updates to interest items.
 * @example { id: "interest-1", name: "Mechanical computing" }
 */
const interestItemPatchSchema = createItemPatchSchema(interestItemDataSchema);

/**
 * @remarks Validates partial updates to award items.
 * @example { id: "award-1", title: "Academic Distinction" }
 */
const awardItemPatchSchema = createItemPatchSchema(awardItemDataSchema);

/**
 * @remarks Validates partial updates to certification items.
 * @example { id: "certification-1", title: "Computing Certificate" }
 */
const certificationItemPatchSchema = createItemPatchSchema(certificationItemDataSchema);

/**
 * @remarks Validates partial updates to publication items.
 * @example { id: "publication-1", title: "Scientific Memoir" }
 */
const publicationItemPatchSchema = createItemPatchSchema(publicationItemDataSchema);

/**
 * @remarks Validates partial updates to volunteer items.
 * @example { id: "volunteer-1", organization: "Analytical Society" }
 */
const volunteerItemPatchSchema = createItemPatchSchema(volunteerItemDataSchema);

/**
 * @remarks Validates partial updates to reference items.
 * @example { id: "reference-1", name: "Charles Babbage" }
 */
const referenceItemPatchSchema = createItemPatchSchema(referenceItemDataSchema);

/**
 * @remarks Validates partial updates to custom section items.
 * @example { id: "custom-item-1", title: "Custom Item" }
 */
const customSectionItemPatchSchema = z.union([
	profileItemPatchSchema,
	experienceItemPatchSchema,
	educationItemPatchSchema,
	projectItemPatchSchema,
	skillItemPatchSchema,
	languageItemPatchSchema,
	interestItemPatchSchema,
	awardItemPatchSchema,
	certificationItemPatchSchema,
	publicationItemPatchSchema,
	volunteerItemPatchSchema,
	referenceItemPatchSchema,
]);

/**
 * @remarks Validates partial updates to any supported list item type.
 * @example { id: "experience-1", company: "Analytical Engine" }
 */
const itemPatchSchema = z.union([
	customFieldPatchSchema,
	profileItemPatchSchema,
	experienceItemPatchSchema,
	educationItemPatchSchema,
	projectItemPatchSchema,
	skillItemPatchSchema,
	languageItemPatchSchema,
	interestItemPatchSchema,
	awardItemPatchSchema,
	certificationItemPatchSchema,
	publicationItemPatchSchema,
	volunteerItemPatchSchema,
	referenceItemPatchSchema,
	customSectionItemPatchSchema,
]);

/**
 * @remarks Identifies the list being mutated by an item operation.
 * @example { kind: "section", section: "experience" }
 */
const itemOpsTargetSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("section"), section: sectionTypeSchema }),
	z.object({ kind: z.literal("customField") }),
	z.object({ kind: z.literal("customSection"), sectionId: z.string() }),
]);

/**
 * @remarks Applies partial updates to scalar fields on the draft payload.
 * @example { op: "setField", path: "basics.name", value: "Ada Lovelace" }
 */
export const setFieldOperationSchema = z.discriminatedUnion("path", [
	z.object({ op: z.literal("setField"), path: z.literal("picture.url"), value: urlValueSchema }),
	z.object({ op: z.literal("setField"), path: z.literal("basics.name"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("basics.headline"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("basics.email"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("basics.phone"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("basics.location"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("basics.website.label"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("basics.website.url"), value: urlValueSchema }),
	z.object({ op: z.literal("setField"), path: z.literal("summary.title"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("summary.content"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("metadata.notes"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("sections.profiles.title"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("sections.experience.title"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("sections.education.title"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("sections.projects.title"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("sections.skills.title"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("sections.languages.title"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("sections.interests.title"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("sections.awards.title"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("sections.certifications.title"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("sections.publications.title"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("sections.volunteer.title"), value: z.string() }),
	z.object({ op: z.literal("setField"), path: z.literal("sections.references.title"), value: z.string() }),
]);

/**
 * @remarks Applies add/update/remove/reorder semantics to draft item lists.
 * @example { op: "itemOps", target: { kind: "section", section: "experience" }, action: "upsert", items: [{ id: "experience-1", company: "Analytical Engine" }] }
 */
export const itemOpsOperationSchema = z.discriminatedUnion("action", [
	z.object({
		op: z.literal("itemOps"),
		action: z.literal("upsert"),
		target: itemOpsTargetSchema,
		items: z.array(itemPatchSchema).min(1),
	}),
	z.object({
		op: z.literal("itemOps"),
		action: z.literal("remove"),
		target: itemOpsTargetSchema,
		ids: z.array(z.string()).min(1),
	}),
	z.object({
		op: z.literal("itemOps"),
		action: z.literal("reorder"),
		target: itemOpsTargetSchema,
		ids: z.array(z.string()).min(1),
	}),
]);
