import { createFileRoute, redirect } from "@tanstack/react-router";
import { VerifyTwoFactorPage } from "@/features/auth/pages/verify-2fa";
import { getAuthRedirectOptions } from "@/features/auth/redirect";

export const Route = createFileRoute("/auth/verify-2fa")({
	component: VerifyTwoFactorPage,
	beforeLoad: ({ context, search }) => {
		if (context.session && !search.reauthenticate) throw redirect(getAuthRedirectOptions(search.callbackURL));
	},
});
