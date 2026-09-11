import { createFileRoute, redirect } from "@tanstack/react-router";
import { RegisterPage } from "@/features/auth/pages/register";
import { getAuthRedirectOptions } from "@/features/auth/redirect";

export const Route = createFileRoute("/auth/register")({
	component: RouteComponent,
	beforeLoad: ({ context, search }) => {
		if (context.session && !search.reauthenticate) throw redirect(getAuthRedirectOptions(search.callbackURL));
		if (context.flags.disableSignups) throw redirect({ to: "/auth/login", search, replace: true });
		return { session: null };
	},
});

function RouteComponent() {
	const { flags } = Route.useRouteContext();

	return <RegisterPage disableEmailAuth={flags.disableEmailAuth} />;
}
