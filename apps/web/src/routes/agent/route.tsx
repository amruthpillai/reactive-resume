import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/agent")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		if (!context.session) throw redirect({ to: "/auth/login", replace: true });
		return { session: context.session };
	},
});

function RouteComponent() {
	return <Outlet />;
}
