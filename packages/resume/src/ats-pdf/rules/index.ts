import type { PdfCheck } from "../types";
import { contactChecks } from "./contact";
import { contentChecks } from "./content";
import { dateChecks } from "./dates";
import { layoutChecks } from "./layout";
import { parseabilityChecks } from "./parseability";
import { sectionChecks } from "./sections";

/** Every check, in report order: the ones that decide whether anything is readable come first. */
export const PDF_CHECKS: readonly PdfCheck[] = [
	...parseabilityChecks,
	...layoutChecks,
	...sectionChecks,
	...contactChecks,
	...dateChecks,
	...contentChecks,
];
