import { Trans } from "@lingui/react/macro";
import { Spinner } from "@reactive-resume/ui/components/spinner";

export function LoadingScreen() {
	return (
		<div className="fixed inset-0 z-50 flex h-svh w-svw items-center justify-center gap-x-3 bg-background">
			<Spinner className="size-6" />
			<p className="text-muted-foreground">
				<Trans>Loading...</Trans>
			</p>
		</div>
	);
}
