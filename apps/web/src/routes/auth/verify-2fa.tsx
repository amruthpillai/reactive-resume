import { createFileRoute, redirect } from "@tanstack/react-router";
import { VerifyTwoFactorPage } from "@/features/auth/pages/verify-2fa";

export const Route = createFileRoute("/auth/verify-2fa")({
	component: VerifyTwoFactorPage,
	beforeLoad: async ({ context }) => {
		if (context.session) throw redirect({ to: "/dashboard", replace: true });
	},
});
