// Pure: how a Design control writes to the draft. No React, no native modules, so Node scenarios can drive it.
import type { UpdateOptions } from "@/draft/types";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { WritableDraft } from "immer";

type Update = (recipe: (draft: WritableDraft<ResumeData>) => void, options?: UpdateOptions) => void;

/**
 * Edits the resume data. `key` names the control. `discrete` changes (taps: segments, swatches, picks, switches,
 * stepper −/+, committed slider and stepper values) are always a step of their own. Continuous ones (typing hex
 * or CSS) with the same key within a second are one undo step.
 */
export type DesignWrite = (key: string, mutate: (data: WritableDraft<ResumeData>) => void, discrete?: boolean) => void;

export const writeTo =
	(update: Update): DesignWrite =>
	(key, mutate, discrete = false) =>
		update(mutate, discrete ? { newStep: true } : { coalesceKey: `design.${key}` });

/**
 * A template preview is read-only: every action the draft exposes (update, undo, redo, Fit's write…) becomes a
 * no-op that resolves, so neither a page control nor its Undo can change the saved draft while it shows.
 */
export function readOnlyDraft<T extends object>(draft: T): T {
	return Object.fromEntries(
		Object.entries(draft).map(([key, value]) => [key, typeof value === "function" ? () => Promise.resolve() : value]),
	) as T;
}
