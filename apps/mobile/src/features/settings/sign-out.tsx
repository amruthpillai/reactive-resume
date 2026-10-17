import { useLingui } from "@lingui/react/macro";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { signOut, useSession } from "@/auth/session";
import { routes } from "@/routes";
import { ConfirmDialog, ListRow, showToast } from "@/ui";

type SignOutRowProps = { switchServer?: boolean };
export function SignOutRow({ switchServer = false }: SignOutRowProps) {
	const { t } = useLingui();
	const { server } = useSession();
	const queryClient = useQueryClient();
	const pendingSettings = useIsMutating({ mutationKey: ["settings"] });
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const leave = async () => {
		setOpen(false);
		setBusy(true);
		try {
			await queryClient.cancelQueries();
			await signOut();
			queryClient.clear();
			router.replace(switchServer ? routes.server() : routes.signIn());
		} catch {
			showToast({ message: t`Couldn't sign out. Try again.` });
		} finally {
			setBusy(false);
		}
	};
	return (
		<>
			<ListRow
				title={switchServer ? t`Server` : t`Sign out`}
				subtitle={switchServer ? server : undefined}
				leading={switchServer ? "globe" : "sign-out"}
				destructive={!switchServer}
				chevron={switchServer}
				disabled={busy || pendingSettings > 0}
				onPress={() => setOpen(true)}
			/>
			<ConfirmDialog
				open={open}
				title={switchServer ? t`Switch server?` : t`Sign out?`}
				message={t`You will be signed out of ${server}. Any edits not yet synced from this device will be lost.`}
				confirmLabel={t`Sign out`}
				destructive
				onCancel={() => setOpen(false)}
				onConfirm={() => void leave()}
			/>
		</>
	);
}
