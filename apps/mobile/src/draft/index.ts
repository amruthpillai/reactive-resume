import type { LetterDocument, ResumeDocument } from "./types";
import { useEffect, useRef } from "react";
import { nativeEnvironment } from "./native";
import { resume, letter, useResumeStore, useLetterStore } from "./runtime";
import { useSession } from "@/auth/session";
export { useResumeStore, useLetterStore, clearDraftsFor, getDraftScope } from "./runtime";

/** Call once in the builder owner, not once per pane. Token refresh preserves history; account switches do not. */
function useDraftOwner(id: string, draft: typeof resume | typeof letter) {
	const session = useSession();
	const owner = useRef<string | null>(null);
	useEffect(() => {
		let cancelled = false;
		if (session.status !== "signed-in") {
			if (session.status === "signed-out") {
				if (owner.current) draft.clearDraftsFor(owner.current);
				owner.current = null;
			}
			draft.suspend();
			return;
		}
		void nativeEnvironment
			.scope()
			.then(async (scope) => {
				if (cancelled) return;
				if (!scope) {
					owner.current = null;
					draft.suspend();
					return;
				}
				if (owner.current === scope && draft.store.getState().document?.id === id) return;
				draft.suspend();
				owner.current = scope;
				await draft.store.getState().open(id);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [id, session, draft]);
	useEffect(
		() => () => {
			owner.current = null;
			void draft.store.getState().close();
		},
		[id, draft],
	);
}

export function useResumeDraft(id: string) {
	useDraftOwner(id, resume);
	return useResumeStore();
}

export function useLetterDraft(id: string) {
	useDraftOwner(id, letter);
	return useLetterStore();
}

export const useUpdateResumeData = () => useResumeStore((state) => state.update);
export const useUpdateLetterData = () => useLetterStore((state) => state.update);
export const useResumeData = () => useResumeStore((state) => state.data);
export const useLetterData = () => useLetterStore((state) => state.data);
export const useIsResumeLocked = () => useResumeStore((state) => state.locked);
export const useIsLetterLocked = () => useLetterStore((state) => state.locked);
export const usePatchResume = () => useResumeStore((state) => state.updateDocument);
export const usePatchLetter = () => useLetterStore((state) => state.updateDocument);

export function useCurrentResume(): ResumeDocument {
	const document = useResumeStore((state) => state.document);
	if (!document) throw new Error("Open a resume before rendering the editor.");
	return document;
}

export function useCurrentLetter(): LetterDocument {
	const document = useLetterStore((state) => state.document);
	if (!document) throw new Error("Open a letter before rendering the editor.");
	return document;
}

// Native rich-text focus is separate from TextInput.State; wire these to every editor's onFocus/onBlur.
export const resumeFieldFocus = { onFocus: resume.focus, onBlur: () => void resume.blur() };
export const letterFieldFocus = { onFocus: letter.focus, onBlur: () => void letter.blur() };

/** `open` owns the SSE subscription. This hook offers an explicit refresh on screen focus/mount. */
export function useResumeUpdateSubscription() {
	useEffect(() => {
		void resume.refresh().catch(() => {});
	}, []);
}

export function useLetterUpdateSubscription() {
	useEffect(() => {
		void letter.refresh().catch(() => {});
	}, []);
}

export type { ResumeDraftStore, LetterDraftStore, SaveStatus, ConflictChoice, UpdateOptions } from "./types";
export { DraftConflictSheet, ResumeConflictSheet, LetterConflictSheet } from "./conflict-sheet";
