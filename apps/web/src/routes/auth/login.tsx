import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginPage } from "@/features/auth/pages/login";
import { getAuthRedirectOptions } from "@/features/auth/redirect";

export const Route = createFileRoute("/auth/login")({
	component: RouteComponent,
	beforeLoad: ({ context, search }) => {
		if (context.session && !search.reauthenticate) throw redirect(getAuthRedirectOptions(search.callbackURL));
		return { session: null };
	},
});

function RouteComponent() {
	const { flags } = Route.useRouteContext();

	return <LoginPage disableEmailAuth={flags.disableEmailAuth} disableSignups={flags.disableSignups} />;
}
