// Pure: how a Design control writes to the draft. No React, no native modules, so Node scenarios can drive it.
import type { UpdateOptions } from "@/draft/types";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { WritableDraft } from "immer";

type Update = (recipe: (draft: WritableDraft<ResumeData>) => void, options?: UpdateOptions) => void;

/**
 * Edits the resume data. `key` names the control. `discrete` changes (taps: segments, swatches, picks, switches,
 * stepper −/+ and committed stepper values) are always a step of their own. Continuous ones (slider drags, typing
 * hex or CSS) with the same key within a second are one undo step.
 */
export type DesignWrite = (key: string, mutate: (data: WritableDraft<ResumeData>) => void, discrete?: boolean) => void;

export const writeTo =
	(update: Update): DesignWrite =>
	(key, mutate, discrete = false) =>
		update(mutate, discrete ? { newStep: true } : { coalesceKey: `design.${key}` });
