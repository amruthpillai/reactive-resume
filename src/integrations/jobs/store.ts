import type { WritableDraft } from "immer";

import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { create } from "zustand/react";

import type { RapidApiQuota } from "@/schema/jobs";

type TestStatus = "unverified" | "success" | "failure";

type JobsStoreState = {
  rapidApiKey: string;
  testStatus: TestStatus;
  rapidApiQuota: RapidApiQuota | null;
};

type JobsStoreActions = {
  set: (fn: (draft: WritableDraft<JobsStoreState>) => void) => void;
  reset: () => void;
};

type JobsStore = JobsStoreState & JobsStoreActions;

const initialState: JobsStoreState = {
  rapidApiKey: "",
  testStatus: "unverified",
  rapidApiQuota: null,
};

export const useJobsStore = create<JobsStore>()(
  persist(
    immer((set) => ({
      ...initialState,
      set: (fn) => {
        set((draft) => {
          const prev = { rapidApiKey: draft.rapidApiKey };

          fn(draft);

          if (draft.rapidApiKey !== prev.rapidApiKey) {
            draft.testStatus = "unverified";
          }
        });
      },
      reset: () => set(() => initialState),
    })),
    {
      name: "jobs-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        rapidApiKey: state.rapidApiKey,
        testStatus: state.testStatus,
      }),
    },
  ),
);
