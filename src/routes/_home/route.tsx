import { Trans } from "@lingui/react/macro";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Header } from "./-sections/header";

export const Route = createFileRoute("/_home")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<>
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring"
			>
				<Trans>Skip to main content</Trans>
			</a>

			<Header />
			<Outlet />
		</>
	);
}
