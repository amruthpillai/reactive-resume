import { Trans } from "@lingui/react/macro";
import { ArrowClockwiseIcon, WarningIcon } from "@phosphor-icons/react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { BrandIcon } from "../ui/brand-icon";

export function ErrorScreen({ error, reset }: ErrorComponentProps) {
	return (
		<div className="mx-auto flex h-svh max-w-md flex-col items-center justify-center gap-y-4">
			<BrandIcon variant="logo" className="size-12" />

			<Alert>
				<WarningIcon />
				<AlertTitle>
					<Trans>An error occurred while loading the page.</Trans>
				</AlertTitle>
				<AlertDescription>{error.message}</AlertDescription>
			</Alert>

			<Button onClick={reset}>
				<ArrowClockwiseIcon />
				<Trans>Refresh</Trans>
			</Button>
		</div>
	);
}
