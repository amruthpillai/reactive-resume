import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useRootNavigationState, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { hostOf } from "./auth-header";
import { getSession, signOut, subscribeIdentity, subscribeSession, useSession } from "./session";
import { useSignIn } from "./use-sign-in";
import { routes } from "@/routes";
import { Banner, Button, Sheet, showToast, useTheme } from "@/ui";

/**
 * Route guard and session-expired prompt. Mounted once in app/_layout.tsx.
 * - Signed out anywhere but `(auth)`: go to sign-in.
 * - Signing out: go to sign-in at once, in the same tick, so a caller that navigates after `signOut()` (Settings →
 *   Switch server) always has the last word; then the AU7 toast.
 * - Signed in on an `(auth)` screen: go to Documents.
 * - Expired: stay where the user is, under a sheet that asks to sign in again (AU8).
 * - Account change (sign-in, switch, sign-out, expiry): the React Query cache is cancelled and cleared.
 */
export function SessionGate() {
	const { t } = useLingui();
	// Bind to this root; Android recreation can unbind the previous root's global router during cleanup.
	const router = useRouter();
	const { status } = useSession();
	const segments = useSegments();
	const navigationReady = !!useRootNavigationState()?.key;
	const path = segments.join("/");
	const inAuth = path.startsWith("(auth)");
	// The OAuth redirect route steps back by itself (app/(auth)/auth/native-callback.tsx).
	const atCallback = path === "(auth)/auth/native-callback";
	const where = useRef({ inAuth });
	const queryClient = useQueryClient();

	// Server data belongs to one account: drop it (and stop its requests) the moment the account changes.
	useEffect(
		() =>
			subscribeIdentity(() => {
				void queryClient.cancelQueries();
				queryClient.clear();
			}),
		[queryClient],
	);
	const previous = useRef(status);

	useEffect(() => {
		where.current = { inAuth };
	});

	useEffect(() => {
		let last = getSession().status;
		return subscribeSession(() => {
			const { status: next, server } = getSession();
			const leaving = next === "signed-out" && (last === "signed-in" || last === "expired");
			last = next;
			if (!leaving) return;
			if (!where.current.inAuth) router.replace(routes.signIn());
			showToast({ message: t`Signed out of ${hostOf(server)}. Your documents are still there.` });
		});
	}, [router, t]);

	useEffect(() => {
		const before = previous.current;
		previous.current = status;
		if (!navigationReady || atCallback) return;
		const signedOutNow = before === "signed-in" || before === "expired";
		if (status === "signed-out" && !inAuth && !signedOutNow) router.replace(routes.signIn());
		else if (status === "signed-in" && inAuth) router.replace(routes.documents());
	}, [navigationReady, status, inAuth, atCallback, router]);

	return status === "expired" ? <SessionExpiredSheet /> : null;
}

function SessionExpiredSheet() {
	const { t } = useLingui();
	const { space } = useTheme();
	const { server } = useSession();
	const { attempt, start, reset } = useSignIn();
	// The sheet cannot be dismissed: swiping it away presents it again.
	const [presentation, setPresentation] = useState(0);

	useEffect(() => {
		if (attempt.state !== "failed") return;
		showToast({ message: attempt.message });
		reset();
	}, [attempt, reset]);

	return (
		<Sheet key={presentation} open title={t`Sign in again`} onClose={() => setPresentation((count) => count + 1)}>
			<View style={{ gap: space.s3, paddingHorizontal: space.s4 }}>
				<Banner
					tone="warn"
					icon="clock"
					title={t`Your session on ${hostOf(server)} ended`}
					message={t`Sign in again to keep working. Edits you made are kept on this device and sync after you sign in.`}
				/>
				<Button
					label={t`Sign in again`}
					icon="arrow-square-out"
					size="lg"
					fullWidth
					loading={attempt.state === "waiting"}
					onPress={() => void start(server)}
				/>
				<Button
					label={t`Sign out`}
					variant="ghost"
					size="lg"
					fullWidth
					onPress={() =>
						void signOut().catch(() =>
							showToast({ message: t`Signed out, but some data on this device couldn't be removed.` }),
						)
					}
				/>
			</View>
		</Sheet>
	);
}
