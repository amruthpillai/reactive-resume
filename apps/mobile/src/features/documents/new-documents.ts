import type { DocumentSummary } from "./filter";
import Storage from "expo-sqlite/kv-store";
import { createJSONStorage, persist } from "zustand/middleware";
import { create } from "zustand/react";
import { documentKey } from "./filter";
import { getServer } from "@/auth/session";

type NewDocuments = {
	ids: string[];
	markNew: (document: Pick<DocumentSummary, "id" | "type">) => void;
	markOpened: (document: Pick<DocumentSummary, "id" | "type">) => void;
};
const key = (document: Pick<DocumentSummary, "id" | "type">) => `${getServer()}:${documentKey(document)}`;

/** Cosmetic IDs only, bounded like the web library; no document contents are persisted here. */
export const useNewDocuments = create<NewDocuments>()(
	persist(
		(set) => ({
			ids: [],
			markNew: (document) =>
				set((state) => ({ ids: [key(document), ...state.ids.filter((id) => id !== key(document))].slice(0, 50) })),
			markOpened: (document) => set((state) => ({ ids: state.ids.filter((id) => id !== key(document)) })),
		}),
		{
			name: "mobile:new-documents",
			storage: createJSONStorage(() => ({
				getItem: (name) => {
					try {
						return Storage.getItemSync(name);
					} catch {
						return null;
					}
				},
				setItem: (name, value) => {
					try {
						Storage.setItemSync(name, value);
					} catch {
						/* Cosmetic badge can stay memory-only. */
					}
				},
				removeItem: (name) => {
					try {
						Storage.removeItemSync(name);
					} catch {
						/* Cosmetic badge can stay memory-only. */
					}
				},
			})),
		},
	),
);

export const isNewDocument = (ids: readonly string[], document: DocumentSummary) => ids.includes(key(document));
