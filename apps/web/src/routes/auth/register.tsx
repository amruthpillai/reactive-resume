import { createFileRoute, redirect } from "@tanstack/react-router";
import { RegisterPage } from "@/features/auth/pages/register";

export const Route = createFileRoute("/auth/register")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		if (context.session) throw redirect({ to: "/dashboard", replace: true });
		if (context.flags.disableSignups) throw redirect({ to: "/auth/login", replace: true });
		return { session: null };
	},
});

function RouteComponent() {
	const { flags } = Route.useRouteContext();

	return <RegisterPage disableEmailAuth={flags.disableEmailAuth} />;
}
