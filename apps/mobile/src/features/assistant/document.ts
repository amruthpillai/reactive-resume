import type { Proposal, ProposalState } from "@reactive-resume/resume/proposals";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { useEffect, useMemo, useRef } from "react";
import { getProposalState } from "@reactive-resume/resume/proposals";
import { acceptResumeProposals } from "./proposals";
import { useSession } from "@/auth/session";
import { useResumeStore } from "@/draft";
import { useApplications } from "@/features/applications/queries";

/** The document the assistant works on (web: AssistantDocument). Only resumes have an assistant route on mobile. */
export type AssistantDocument = {
	kind: "resume" | "letter";
	id: string;
	name: string;
	locked: boolean;
	/** The application it's for, whose posting is shared as context. */
	posting: { id: string; company: string; role: string } | null;
	/** A proposal's state against the document as it reads now. */
	stateOf: (proposal: Proposal) => ProposalState;
	/** Applies proposals to the draft as one undo step, with Undo in the toast. */
	accept: (proposals: readonly Proposal[]) => void;
};

/**
 * The open resume from the M3-T3 draft store, or null until the builder has opened `resumeId`. `applicationId` is
 * the application it was opened for; otherwise the one it was made for, then the latest one linked to it.
 */
export function useResumeAssistantDocument(resumeId: string, applicationId?: string): AssistantDocument | null {
	const document = useResumeStore((state) => (state.document?.id === resumeId ? state.document : null));
	const data = useResumeStore((state) => (state.document?.id === resumeId ? (state.data as ResumeData | null) : null));
	const locked = useResumeStore((state) => state.locked);
	const { data: applications } = useApplications();

	return useMemo(() => {
		if (!document || !data) return null;
		const application = applicationId
			? applications?.find((item) => item.id === applicationId)
			: (applications?.find((item) => item.id === document.applicationId) ??
				applications?.find((item) => item.resumeId === document.id));
		return {
			kind: "resume",
			id: document.id,
			name: document.name,
			locked,
			posting: application ? { id: application.id, company: application.company, role: application.role } : null,
			stateOf: (proposal) => getProposalState(data, proposal),
			accept: acceptResumeProposals,
		};
	}, [document, data, locked, applications, applicationId]);
}

const openDraft = (resumeId: string) =>
	void useResumeStore
		.getState()
		.open(resumeId)
		.catch(() => undefined);

/**
 * The builder layout owns the draft; the Assistant subscribes to it. Only when nothing is open at all (no owner, as
 * after a direct link) does it open `resumeId`, once, when it mounts. It never reopens when another pane changes the
 * draft, so it can't close that pane's document. Another resume being open is reported, not reclaimed.
 */
export function useOpenResumeDraft(resumeId: string) {
	const session = useSession();
	const signedIn = session.status === "signed-in";
	const loaded = useResumeStore((state) => state.document?.id === resumeId);
	const otherOpen = useResumeStore((state) => state.document !== null && state.document.id !== resumeId);
	const failed = useResumeStore((state) => state.document === null && state.status === "error");
	const tried = useRef<string | null>(null);

	useEffect(() => {
		if (!signedIn || tried.current === resumeId) return;
		tried.current = resumeId;
		if (useResumeStore.getState().document === null) openDraft(resumeId);
	}, [resumeId, signedIn]);

	return { loaded, otherOpen, failed, retry: () => openDraft(resumeId) };
}
