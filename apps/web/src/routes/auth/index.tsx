import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAuthRedirectOptions } from "@/features/auth/redirect";

export const Route = createFileRoute("/auth/")({
	beforeLoad: ({ context, search }) => {
		if (context.session && !search.reauthenticate) throw redirect(getAuthRedirectOptions(search.callbackURL));
		throw redirect({ to: "/auth/login", search, replace: true });
	},
});
