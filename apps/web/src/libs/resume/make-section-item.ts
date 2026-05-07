import { generateId } from "@reactive-resume/utils/string";

/**
 * Resolves initial values for section-item create dialogs.
 *
 * Expected usage:
 * - Duplicate flow: pass a fully schema-valid `item`; this helper clones it and always generates a fresh `id`.
 * - Create flow: pass no `item`; this helper uses `createItem` and still guarantees a fresh `id`.
 *
 * This helper intentionally does not deep-merge partial items. Callers should provide either a complete item
 * (duplicate) or no item (create) to keep the seam explicit and predictable.
 */
export function makeSectionItem<T extends { id: string }>(defaultItem: T, item?: T): T {
	if (item) return { ...item, id: generateId() };
	return { ...defaultItem, id: generateId() };
}
