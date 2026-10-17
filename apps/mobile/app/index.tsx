import { Redirect } from "expo-router";
import { useSession } from "@/auth/session";
import { routes } from "@/routes";

/** The launch route: straight to sign-in when signed out, so Documents never renders first. */
export default function Index() {
	const { status } = useSession();
	// Expired stays on Documents under the "Sign in again" sheet (SessionGate).
	if (status === "signed-in" || status === "expired") return <Redirect href={routes.documents()} />;
	return <Redirect href={routes.signIn()} />;
}
