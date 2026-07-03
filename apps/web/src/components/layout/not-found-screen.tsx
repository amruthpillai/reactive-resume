import { Trans } from "@lingui/react/macro";
import { HouseIcon, MagnifyingGlassIcon, WarningIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "@reactive-resume/ui/components/alert";
import { BrandIcon } from "@reactive-resume/ui/components/brand-icon";
import { buttonVariants } from "@reactive-resume/ui/components/button";

export function NotFoundScreen() {
	return (
		<div className="mx-auto flex h-svh max-w-md flex-col items-center justify-center gap-y-4">
			<BrandIcon variant="logo" className="size-12" />

			<Alert>
				<WarningIcon />
				<AlertTitle>
					<Trans>We couldn't find that page</Trans>
				</AlertTitle>
				<AlertDescription>
					<Trans>The page you're looking for may have been moved or no longer exists.</Trans>
				</AlertDescription>
			</Alert>

			<div className="flex items-center gap-x-2">
				<Link to="/dashboard" className={buttonVariants()}>
					<MagnifyingGlassIcon />
					<Trans>Go to dashboard</Trans>
				</Link>

				<Link to="/" className={buttonVariants({ variant: "secondary" })}>
					<HouseIcon />
					<Trans>Go home</Trans>
				</Link>
			</div>
		</div>
	);
}
