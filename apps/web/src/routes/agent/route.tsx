import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createNoindexFollowMeta } from "@/libs/seo";

export const Route = createFileRoute("/agent")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		if (!context.session) throw redirect({ to: "/auth/login", replace: true });
		return { session: context.session };
	},
	head: () => ({
		meta: [createNoindexFollowMeta()],
	}),
});

function RouteComponent() {
	return <Outlet />;
}
