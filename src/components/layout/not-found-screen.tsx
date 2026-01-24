import { Trans } from "@lingui/react/macro";
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
					<Trans>An error occurred while loading the page.</Trans>
				</AlertTitle>
				<AlertDescription>{routeId}</AlertDescription>
			</Alert>

			<Button asChild>
				<Link to="..">
					<ArrowLeftIcon />
					<Trans>Go Back</Trans>
				</Link>
			</Button>
		</div>
	);
}
