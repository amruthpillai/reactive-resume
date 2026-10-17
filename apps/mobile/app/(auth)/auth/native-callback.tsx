import { useRouter } from "expo-router";
import { useEffect } from "react";
import { routes } from "@/routes";

/**
 * `/auth/native-callback`, the OAuth redirect. On Android the App Link (or the development scheme) also reaches the
 * router while the sign-in session reads the code from it, so this screen only steps back to where the user was.
 */
export default function NativeCallback() {
	const router = useRouter();
	useEffect(() => {
		if (router.canGoBack()) router.back();
		else router.replace(routes.signIn());
	}, [router]);

	return null;
}
