import { createFileRoute, redirect } from "@tanstack/react-router";
import { ForgotPasswordPage } from "@/features/auth/pages/forgot-password";

export const Route = createFileRoute("/auth/forgot-password")({
	component: ForgotPasswordPage,
	beforeLoad: ({ context }) => {
		if (context.flags.disableEmailAuth) throw redirect({ to: "/auth/login", replace: true });
	},
});
