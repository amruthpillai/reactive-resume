import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BrandIcon } from "@reactive-resume/ui/components/brand-icon";

export const Route = createFileRoute("/auth")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="mx-auto flex h-svh w-dvw max-w-sm flex-col justify-center space-y-6 px-4 xs:px-0">
			<BrandIcon className="mb-4 size-20 self-center" />

			<Outlet />
		</div>
	);
}
