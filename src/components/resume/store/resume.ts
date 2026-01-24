import { t } from "@lingui/core/macro";
import { debounce } from "es-toolkit";
import type { WritableDraft } from "immer";
import { current } from "immer";
import { toast } from "sonner";
import { immer } from "zustand/middleware/immer";
import { create } from "zustand/react";
import { orpc, type RouterOutput } from "@/integrations/orpc/client";
import type { ResumeData } from "@/schema/resume/data";

type Resume = Omit<RouterOutput["resume"]["getById"], "hasPassword">;

type ResumeStoreState = {
	resume: Resume;
	isReady: boolean;
};

type ResumeStoreActions = {
	initialize: (resume: Resume | null) => void;
	updateResumeData: (fn: (draft: WritableDraft<ResumeData>) => void) => void;
};

type ResumeStore = ResumeStoreState & ResumeStoreActions;

const controller = new AbortController();
const signal = controller.signal;

const _syncResume = (resume: Resume) => {
	orpc.resume.update.call({ id: resume.id, data: resume.data }, { signal });
};

const syncResume = debounce(_syncResume, 500, { signal });

let errorToastId: string | number | undefined;

export const useResumeStore = create<ResumeStore>()(
	immer((set) => ({
		resume: null as unknown as Resume,
		isReady: false,

		initialize: (resume) => {
			set((state) => {
				state.resume = resume as Resume;
				state.isReady = resume !== null;
			});
		},

		updateResumeData: (fn) => {
			set((state) => {
				if (!state.resume) return state;

				if (state.resume.isLocked) {
					errorToastId = toast.error(t`This resume is locked and cannot be updated.`, { id: errorToastId });
					return state;
				}

				fn(state.resume.data);
				syncResume(current(state.resume));
			});
		},
	})),
);
