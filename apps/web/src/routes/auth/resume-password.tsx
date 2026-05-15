import { createFileRoute, redirect, SearchParamError } from "@tanstack/react-router";
import z from "zod";
import { ResumePasswordPage } from "@/features/auth/pages/resume-password";

const searchSchema = z.object({
	redirect: z
		.string()
		.min(1)
		.regex(/^\/[^/]+\/[^/]+$/),
});

export const Route = createFileRoute("/auth/resume-password")({
	component: RouteComponent,
	validateSearch: searchSchema,
	onError: (error) => {
		if (error instanceof SearchParamError) {
			throw redirect({ to: "/" });
		}
	},
});

function RouteComponent() {
	const { redirect } = Route.useSearch();

	return <ResumePasswordPage redirectPath={redirect} />;
}
