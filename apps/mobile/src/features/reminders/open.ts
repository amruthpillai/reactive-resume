import * as Notifications from "expo-notifications";
import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect } from "react";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";

/**
 * Tapping a reminder opens its application: a tap while the app runs, or the tap that launched it. Mounted once in
 * app/_layout.tsx, which renders after the session is restored; it waits for navigation too. Each tap is cleared once
 * handled. Signed out or expired, the tap is dropped and SessionGate's sign-in stands.
 */
export function useOpenReminder() {
	// Bind to this root; Android recreation can unbind the previous root's global router during cleanup.
	const router = useRouter();
	const { status } = useSession();
	const navigationReady = !!useRootNavigationState()?.key;
	const response = Notifications.useLastNotificationResponse();

	useEffect(() => {
		if (!response || !navigationReady || status === "loading") return;
		Notifications.clearLastNotificationResponse();
		const applicationId = response.notification.request.content.data?.applicationId;
		if (
			status === "signed-in" &&
			response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER &&
			typeof applicationId === "string"
		)
			router.push(routes.applicationDetails(applicationId));
	}, [response, navigationReady, status, router]);
}
