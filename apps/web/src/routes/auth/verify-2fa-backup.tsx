import { createFileRoute, redirect } from "@tanstack/react-router";
import { VerifyTwoFactorBackupPage } from "@/features/auth/pages/verify-2fa";

export const Route = createFileRoute("/auth/verify-2fa-backup")({
	component: VerifyTwoFactorBackupPage,
	beforeLoad: ({ context }) => {
		if (context.session) throw redirect({ to: "/dashboard", replace: true });
	},
});
