import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { WritableDraft } from "immer";
import { useEffect } from "react";
import { useSession } from "@/auth/session";
import { useResumeStore } from "@/draft";

/**
 * Design subscribes to the builder's draft; it never closes it. Until the builder layout owns the draft (M2-T2
 * fix round), Page owns it, so this opens the resume when no owner has (Design opened first, or right after Page
 * closed it on a pane switch). Once the layout owns it, the open never fires and this is a plain subscription.
 */
export function useDesignDraft(id: string) {
	const draft = useResumeStore();
	const session = useSession();
	const current = draft.document?.id === id;
	useEffect(() => {
		if (!current && session.status === "signed-in")
			void useResumeStore
				.getState()
				.open(id)
				.catch(() => {});
	}, [id, current, session.status]);
	return current ? draft : { ...draft, document: null, data: null };
}

/**
 * Edits the resume data. `key` names the control: continuous changes (slider drags, typing) with the same key
 * within a second are one undo step; `discrete` changes (a tap) are always a step of their own.
 */
export type DesignWrite = (key: string, mutate: (data: WritableDraft<ResumeData>) => void, discrete?: boolean) => void;

export const designWrite: DesignWrite = (key, mutate, discrete = false) =>
	useResumeStore.getState().update(mutate, discrete ? { newStep: true } : { coalesceKey: `design.${key}` });
