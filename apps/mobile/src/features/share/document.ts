import { t } from "@lingui/core/macro";
import { useEffect } from "react";
import { useSession } from "@/auth/session";
import { useResumeStore } from "@/draft";

/** Modal panes borrow the builder's draft; they must not close its owner on dismissal. */
export function useShareDocument(id: string) {
	const draft = useResumeStore();
	const session = useSession();
	const current = draft.document?.id === id;
	useEffect(() => {
		if (useResumeStore.getState().document?.id !== id && session.status === "signed-in")
			void useResumeStore
				.getState()
				.open(id)
				.catch(() => {});
	}, [id, session.status]);
	return current ? draft : { ...draft, document: null, data: null };
}

/** flush resolves on offline/conflict failures too; check the resulting status before server actions. */
export async function flushResume(id: string) {
	if (useResumeStore.getState().document?.id !== id) throw new Error(t`Resume could not be loaded.`);
	await useResumeStore.getState().flush();
	const state = useResumeStore.getState();
	if (state.document?.id !== id || state.conflict || !["idle", "saved"].includes(state.status)) {
		throw new Error(t`Couldn't save your changes. Try again before continuing.`);
	}
	return state.document;
}
