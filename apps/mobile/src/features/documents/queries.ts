import type { DocumentSummary } from "./filter";
import { t } from "@lingui/core/macro";
import { ORPCError } from "@orpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getNetworkStateAsync } from "expo-network";
import { useRef, useState } from "react";
import { documentRef } from "./filter";
import { client, orpc } from "@/api/client";
import { getServer, useSession } from "@/auth/session";
import { showToast } from "@/ui";

export function documentError(error: unknown) {
	if (error instanceof ORPCError) {
		if (error.code === "UNAUTHORIZED") return t`Your session expired. Sign in again.`;
		if (error.code === "FORBIDDEN") return t`Unlock it first, then try again.`;
		if (error.code === "NOT_FOUND") return t`This document is no longer available. Refresh and try again.`;
		if (error.code === "TOO_MANY_REQUESTS" || error.code === "RATE_LIMIT_EXCEEDED")
			return t`Too many requests. Try again later.`;
		if (error.code === "BAD_REQUEST") return t`Check the file or fields and try again.`;
	}
	return t`Couldn't complete this action. Try again.`;
}

export function useDocuments(trashed = false) {
	const session = useSession();
	const options = orpc.documents.list.queryOptions({ input: { trashed } });
	return useQuery({
		...options,
		queryKey: [...options.queryKey, session.server],
		enabled: session.status === "signed-in",
	});
}

export function useDocumentRefresh() {
	const queryClient = useQueryClient();
	return () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: orpc.documents.key() }),
			queryClient.invalidateQueries({ queryKey: orpc.resume.key() }),
			queryClient.invalidateQueries({ queryKey: orpc.coverLetters.key() }),
			queryClient.invalidateQueries({ queryKey: orpc.applications.key() }),
		]);
}

/** Serialize user actions; report partial batches and undo only successful Trash moves. */
export function useDocumentOperations() {
	const refresh = useDocumentRefresh();
	const session = useSession();
	const active = useRef(false);
	const idle = useRef(Promise.resolve());
	const partial = useRef(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fail = (message: string) => {
		setError(message);
		showToast({ message });
		return false;
	};
	const run = async (task: () => Promise<unknown>) => {
		if (active.current) return false;
		active.current = true;
		let finish = () => {};
		idle.current = new Promise<void>((resolve) => {
			finish = resolve;
		});
		partial.current = false;
		setBusy(true);
		setError(null);
		try {
			if (session.status !== "signed-in" || getServer() !== session.server) {
				return fail(t`Sign in to continue.`);
			}
			const network = await getNetworkStateAsync();
			if (network.isConnected === false || network.isInternetReachable === false) {
				return fail(t`You're offline. Try again when you reconnect.`);
			}
			if (getServer() !== session.server) return false;
			await task();
			return !partial.current;
		} catch (cause) {
			return fail(documentError(cause));
		} finally {
			try {
				await refresh();
			} finally {
				active.current = false;
				setBusy(false);
				finish();
			}
		}
	};
	const batch = async (
		documents: readonly DocumentSummary[],
		task: (document: DocumentSummary) => Promise<unknown>,
		applies: (document: DocumentSummary) => boolean = () => true,
	) => {
		const done: DocumentSummary[] = [];
		// Sequential calls avoid overwhelming per-account mutation limits.
		for (const document of documents) {
			if (!applies(document)) continue;
			if (getServer() !== session.server) break;
			try {
				await task(document);
				done.push(document);
			} catch {
				/* Remaining documents can still succeed. */
			}
		}
		if (done.length !== documents.length) {
			partial.current = true;
			setError(
				t`Updated ${done.length} of ${documents.length}. Locked documents, and letters for public links, were skipped. Refresh and retry any failures.`,
			);
		}
		showToast({ message: t`${done.length} of ${documents.length} documents updated.` });
		return done;
	};
	const trash = async (documents: readonly DocumentSummary[]) => {
		let done: DocumentSummary[] = [];
		const success = await run(async () => {
			done = await batch(
				documents,
				(document) => client.documents.trash(documentRef(document)),
				(document) => !document.isLocked,
			);
		});
		if (done.length)
			showToast({
				message: t`Moved ${done.length} of ${documents.length} to Trash.`,
				action: {
					label: t`Undo`,
					onPress: () => {
						void idle.current.then(() =>
							run(() => batch(done, (document) => client.documents.restore(documentRef(document)))),
						);
					},
				},
			});
		return success;
	};
	return { run, batch, trash, busy, error };
}
