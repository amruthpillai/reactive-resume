/**
 * @packageDocumentation
 *
 * @remarks
 * Runtime validation schemas for DraftResume command/operation payloads.
 * This module aggregates replace-style and patch-style operations into a single contract
 * that can be applied in ordered batches.
 *
 * @see {@link ./replace.schema | Replace operations}
 * @see {@link ./item-patch.schema | Patch operations}
 */
import z from "zod";
import {
	replaceBasicsOperationSchema,
	replaceCustomSectionsOperationSchema,
	replaceMetadataOperationSchema,
	replacePictureOperationSchema,
	replaceSectionOperationSchema,
	replaceSummaryOperationSchema,
} from "./replace.schema";
import { itemOpsOperationSchema, setFieldOperationSchema } from "./item-patch.schema";

export * from "./replace.schema";
export * from "./item-patch.schema";

/**
 * @remarks Union of all supported draft operations.
 * @example { op: "replaceSummary", data: { title: "", content: "" } }
 */
export const draftOperationSchema = z.union([
	replacePictureOperationSchema,
	replaceBasicsOperationSchema,
	replaceSummaryOperationSchema,
	replaceMetadataOperationSchema,
	replaceSectionOperationSchema,
	replaceCustomSectionsOperationSchema,
	setFieldOperationSchema,
	itemOpsOperationSchema,
]);

/**
 * @remarks Validates a non-empty list of draft operations.
 * @example [{ op: "replaceBasics", data: { name: "", headline: "", email: "", phone: "", location: "", website: { label: "", url: "" }, customFields: [] } }]
 */
export const draftOperationListSchema = z.array(draftOperationSchema).min(1);
