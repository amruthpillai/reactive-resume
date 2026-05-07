import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/settings/ai")({
	beforeLoad: () => {
		throw redirect({ to: "/dashboard/settings/integrations", replace: true });
	},
});
