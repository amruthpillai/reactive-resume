import { createFileRoute, redirect } from "@tanstack/react-router";
import { OAuthConsentPage } from "@/features/auth/pages/consent";

export const Route = createFileRoute("/auth/consent")({
	ssr: false,
	beforeLoad: ({ context, location }) => {
		if (!context.session) {
			throw redirect({
				to: "/auth/login",
				search: {
					callbackURL: `/api/auth/oauth${typeof window === "undefined" ? location.searchStr : window.location.search}`,
				},
			});
		}
		return { session: context.session };
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { session } = Route.useRouteContext();
	// This route is client-only. TanStack serializes repeated parameters as JSON
	// arrays in location.searchStr, invalidating the provider signature. Use the URL verbatim.
	const oauthQuery = window.location.search.slice(1);
	return <OAuthConsentPage key={oauthQuery} oauthQuery={oauthQuery} email={session.user.email} />;
}
