import { ArrowLeftIcon, WarningIcon } from "@phosphor-icons/react";
import { Link, type NotFoundRouteProps } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { BrandIcon } from "../ui/brand-icon";

export function NotFoundScreen({ routeId }: NotFoundRouteProps) {
	return (
		<div className="mx-auto flex h-svh max-w-md flex-col items-center justify-center gap-y-4">
			<BrandIcon variant="logo" className="size-12" />

			<Alert>
				<WarningIcon />
				<AlertTitle>
					An error occurred while loading the page.
				</AlertTitle>
				<AlertDescription>{routeId}</AlertDescription>
			</Alert>

			<Button asChild>
				<Link to="..">
					<ArrowLeftIcon />
					Go Back
				</Link>
			</Button>
		</div>
	);
}
