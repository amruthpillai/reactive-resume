// Board drag and drop state, kept pure so Node runs it in the M5-T3 scenarios.
import type { ApplicationStatus } from "@reactive-resume/schema/applications/data";

/** A dropped card shown in its new column until the list's optimistic update lands. */
export type PendingMove = { id: string; from: ApplicationStatus; to: ApplicationStatus };

/** Drops the override once the list no longer shows the card at its old stage (moved, rolled back past, or gone). */
export const keepPending = (pending: PendingMove | null, applications: readonly { id: string; status: string }[]) =>
	pending && applications.find((application) => application.id === pending.id)?.status === pending.from
		? pending
		: null;

/**
 * A failed move clears its own override. Without this, a failure that rolls back before the optimistic update
 * renders leaves the list at `from` and the override showing the failed stage forever.
 */
export const pendingAfterError = (pending: PendingMove | null, id: string, to: ApplicationStatus) =>
	pending?.id === id && pending.to === to ? null : pending;

export type ColumnRect = { x: number; width: number };

/** The stage whose column (in window coordinates) contains `x`, or null between and outside columns. */
export function stageAt(x: number, rects: ReadonlyMap<ApplicationStatus, ColumnRect>) {
	for (const [stage, rect] of rects) if (x >= rect.x && x <= rect.x + rect.width) return stage;
	return null;
}
