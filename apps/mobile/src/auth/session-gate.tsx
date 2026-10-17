import { useLingui } from "@lingui/react/macro";
import { router, useRootNavigationState, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { hostOf } from "./auth-header";
import { hasChosenServer, signOut, useSession } from "./session";
import { useSignIn } from "./use-sign-in";
import { routes } from "@/routes";
import { Banner, Button, Sheet, showToast, useTheme } from "@/ui";

/**
 * Route guard and session-expired prompt. Mount once inside the root navigator's providers.
 * - Signed out anywhere but `(auth)`: go to sign-in (server picker on first launch).
 * - Signed in on an `(auth)` screen: go to Documents.
 * - Expired: stay where the user is, under a sheet that asks to sign in again (AU8).
 */
export function SessionGate() {
	const { t } = useLingui();
	const { status, server } = useSession();
	const previous = useRef(status);
	const segments = useSegments();
	const navigationReady = !!useRootNavigationState()?.key;
	const path = segments.join("/");
	const inAuth = path.startsWith("(auth)");
	// The OAuth redirect route steps back by itself (app/(auth)/auth/native-callback.tsx).
	const atCallback = path === "(auth)/auth/native-callback";

	useEffect(() => {
		if (!navigationReady || atCallback) return;
		if (status === "signed-out" && !inAuth) router.replace(hasChosenServer() ? routes.signIn() : routes.server());
		else if (status === "signed-in" && inAuth) router.replace(routes.documents());
	}, [navigationReady, status, inAuth, atCallback]);

	// AU7: after signing out, say where the documents are.
	useEffect(() => {
		const before = previous.current;
		previous.current = status;
		if (status === "signed-out" && (before === "signed-in" || before === "expired"))
			showToast({ message: t`Signed out of ${hostOf(server)}. Your documents are still there.` });
	}, [status, server, t]);

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
				<Button label={t`Sign out`} variant="ghost" size="lg" fullWidth onPress={() => void signOut()} />
			</View>
		</Sheet>
	);
}
