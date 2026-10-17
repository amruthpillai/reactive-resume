import type { Session } from "@/auth/session";
import type { PendingDocument } from "@/draft/types";
import { useEffect, useState } from "react";
import { getAccountScope, getSession, useSession } from "@/auth/session";
import { listPendingDrafts, subscribePendingDrafts } from "@/draft/runtime";

type PendingSnapshot = { session: Session; scope: string; documents: PendingDocument[] };

/** Normal Documents navigation can recover local work even before its server list loads. */
export function usePendingDocuments() {
	const session = useSession();
	const scope = getAccountScope();
	const [snapshot, setSnapshot] = useState<PendingSnapshot | null>(null);
	useEffect(() => {
		if (!scope) return;
		let active = true;
		let request = 0;
		const refresh = () => {
			const current = ++request;
			void listPendingDrafts()
				.then((documents) => {
					if (active && current === request && getAccountScope() === scope && getSession() === session)
						setSnapshot({ session, scope, documents });
				})
				.catch(() => {});
		};
		const stop = subscribePendingDrafts(refresh);
		refresh();
		return () => {
			active = false;
			stop();
		};
	}, [scope, session]);
	return scope && snapshot?.scope === scope && snapshot.session === session ? snapshot.documents : [];
}
