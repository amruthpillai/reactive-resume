// Saving the letter before server work, and finishing that work only in the editor visit that started it.
import type { LetterDocument } from "@/draft/types";
import type { WritableDraft } from "immer";
import { client } from "@/api/client";
import { getDraftScope, useLetterStore } from "@/draft";

let visit = 0;

/** The letter layout calls this when an editor visit starts and when it ends. */
export const nextLetterVisit = () => void visit++;

type Visit = { visit: number; id: string; scope: string | null };

/** Reads the visit before any await, so a visit that ends while the scope loads still counts as ended. */
async function startVisit(id: string): Promise<Visit> {
	const current = visit;
	return { visit: current, id, scope: await getDraftScope() };
}

/** Same editor visit, same letter, same account: only then may a late result touch the open draft. */
async function isCurrent(started: Visit) {
	if (visit !== started.visit || useLetterStore.getState().document?.id !== started.id) return false;
	return (await getDraftScope()) === started.scope && visit === started.visit;
}

/**
 * Saves what's typed. True only when the server has it: `flush` also resolves after a failed, offline or
 * conflicting save, and the letter may have changed meanwhile.
 */
export async function saveLetter(id: string) {
	if (useLetterStore.getState().document?.id !== id) return false;
	await useLetterStore.getState().flush();
	const state = useLetterStore.getState();
	return state.document?.id === id && !state.conflict && (state.status === "saved" || state.status === "idle");
}

/**
 * Links (application, resume, live sender details, matching design) change on the server, which then resolves the
 * sender and design from the resume. They stay out of undo, like web's server-side changes: once saved, the resolved
 * style goes into every undo/redo step, so undoing typing never brings back the old copies (and, with them, an own
 * design that ends the link).
 */
export async function relinkLetter(recipe: (letter: WritableDraft<LetterDocument>) => void) {
	const id = useLetterStore.getState().document?.id;
	if (!id) return false;
	// The change shows at once; the visit is read in the same tick.
	const starting = startVisit(id);
	useLetterStore.getState().updateDocument(recipe);
	const started = await starting;
	if (!(await saveLetter(id)) || !(await isCurrent(started))) return false;
	const { document, canUndo, canRedo } = useLetterStore.getState();
	// ponytail: a fresh copy is what makes the store rebase `style` into history; it costs one empty save, so only
	// when there is history to rebase.
	if (document && (canUndo || canRedo)) {
		const style = structuredClone(document.style);
		useLetterStore.getState().updateDocument((letter) => void (letter.style = style));
	}
	return true;
}

/**
 * Restores a version. The server saves "Before restore" first; reopening resets the draft's baseline and undo.
 * False when the user has since left, switched letters or accounts: their open draft is never replaced.
 */
export async function restoreLetterVersion(id: string, versionId: string, unsaved: () => Error) {
	const started = await startVisit(id);
	if (!(await saveLetter(id))) throw unsaved();
	await client.coverLetters.restoreVersion({ id, versionId });
	if (!(await isCurrent(started))) return false;
	await useLetterStore.getState().open(id);
	return true;
}
