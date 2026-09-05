import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/features/auth/layout";
import { authSearchSchema } from "@/features/auth/redirect";
import { createNoindexFollowMeta } from "@/libs/seo";

export const Route = createFileRoute("/auth")({
	component: AuthLayout,
	validateSearch: authSearchSchema,
	head: () => ({
		meta: [createNoindexFollowMeta()],
	}),
});
