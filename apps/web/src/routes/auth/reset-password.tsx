import { createFileRoute, redirect, SearchParamError } from "@tanstack/react-router";
import z from "zod";
import { ResetPasswordPage } from "@/features/auth/pages/reset-password";

const searchSchema = z.object({ token: z.string().min(1) });

export const Route = createFileRoute("/auth/reset-password")({
	component: RouteComponent,
	validateSearch: searchSchema,
	beforeLoad: async ({ context }) => {
		if (context.flags.disableEmailAuth) throw redirect({ to: "/auth/login", replace: true });
	},
	onError: (error) => {
		if (error instanceof SearchParamError) {
			throw redirect({ to: "/auth/login" });
		}
	},
});

function RouteComponent() {
	const { token } = Route.useSearch();

	return <ResetPasswordPage token={token} />;
}
