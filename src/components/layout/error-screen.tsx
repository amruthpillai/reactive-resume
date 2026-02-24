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
					An error occurred while loading the page.
				</AlertTitle>
				<AlertDescription>{error.message}</AlertDescription>
			</Alert>

			<Button onClick={reset}>
				<ArrowClockwiseIcon />
				Refresh
			</Button>
		</div>
	);
}
