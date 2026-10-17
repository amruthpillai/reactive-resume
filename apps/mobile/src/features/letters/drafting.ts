// AI draft of the letter body, streamed over SSE. Ported from startLetterDraft in apps/web/src/features/letters/store.ts.
import { ORPCError } from "@orpc/client";
import { create } from "zustand";
import { saveLetter } from "./save";
import { streamClient } from "@/api/client";
import { useLetterStore } from "@/draft";

export type DraftVariant = "draft" | "shorter" | "personal";

/**
 * A draft kept apart from the letter: streaming, ready to keep, or failed. The body changes only when a draft is
 * kept, so a failed or discarded draft leaves the letter as it was. `last` is what Try again repeats.
 */
export type LetterDraft =
	| { phase: "idle" }
	| { phase: "streaming" | "ready"; text: string }
	| { phase: "failed"; provider: string | null; error: unknown }
	/** What's typed couldn't be saved (offline, error, conflict), so the server would draft from stale links. */
	| { phase: "unsaved" };

type DraftingState = { draft: LetterDraft; last: { variant: DraftVariant; previous?: string | undefined } };

const idle: LetterDraft = { phase: "idle" };

export const useLetterDrafting = create<DraftingState>()(() => ({ draft: idle, last: { variant: "draft" } }));

let drafting: AbortController | null = null;

/** Streams a draft (or a Shorter / More personal revision of `previous`) into `useLetterDrafting`. */
export async function startLetterDraft(variant: DraftVariant = "draft", previous?: string) {
	const letter = useLetterStore.getState().document;
	if (!letter) return;
	drafting?.abort();
	const controller = new AbortController();
	drafting = controller;
	const set = (draft: LetterDraft) => {
		if (drafting === controller) useLetterDrafting.setState({ draft });
	};
	useLetterDrafting.setState({ last: { variant, previous } });
	set({ phase: "streaming", text: "" });

	try {
		// The server drafts from the saved letter's links, so links chosen a moment ago must reach it first.
		const saved = await saveLetter(letter.id);
		if (controller.signal.aborted) return;
		if (useLetterStore.getState().document?.id !== letter.id) return set(idle);
		if (!saved) return set({ phase: "unsaved" });
		const stream = await streamClient.coverLetters.draft(
			{ id: letter.id, variant, ...(previous ? { previous } : {}) },
			{ signal: controller.signal },
		);
		let text = "";
		for await (const chunk of stream) {
			text += chunk;
			set({ phase: "streaming", text });
		}
		if (!text.trim()) throw new Error("The draft came back empty.");
		set({ phase: "ready", text: text.trim() });
	} catch (error) {
		if (controller.signal.aborted) return;
		const data = error instanceof ORPCError ? (error.data as { provider?: unknown } | undefined) : undefined;
		set({ phase: "failed", provider: typeof data?.provider === "string" ? data.provider : null, error });
	}
}

/** Stop, Discard and Dismiss: the letter stays as it was. Also called when the editor closes. */
export function discardLetterDraft() {
	drafting?.abort();
	drafting = null;
	useLetterDrafting.setState({ draft: idle });
}
