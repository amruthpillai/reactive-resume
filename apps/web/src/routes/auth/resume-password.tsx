import { createFileRoute, redirect, SearchParamError } from "@tanstack/react-router";
import { ResumePasswordPage } from "@/features/auth/pages/resume-password";
import { resumePasswordSearchSchema } from "@/features/auth/resume-password-search";

export const Route = createFileRoute("/auth/resume-password")({
	component: RouteComponent,
	validateSearch: resumePasswordSearchSchema,
	onError: (error) => {
		if (error instanceof SearchParamError) {
			throw redirect({ to: "/" });
		}
	},
});

function RouteComponent() {
	const { redirect, returnTo } = Route.useSearch();
	const [username, slug] = redirect.slice(1).split("/") as [string, string];

	return <ResumePasswordPage username={username} slug={slug} redirectPath={returnTo ?? redirect} />;
}
