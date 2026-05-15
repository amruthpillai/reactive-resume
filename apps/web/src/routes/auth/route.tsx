import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/features/auth/layout";
import { createNoindexFollowMeta } from "@/libs/seo";

export const Route = createFileRoute("/auth")({
	component: AuthLayout,
	head: () => ({
		meta: [createNoindexFollowMeta()],
	}),
});
