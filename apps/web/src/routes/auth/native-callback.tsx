import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/native-callback")({
	component: NativeCallbackPage,
});

function NativeCallbackPage() {
	return (
		<div className="space-y-4 text-center">
			<h1 className="text-xl font-semibold">
				<Trans>Open the Reactive Resume app</Trans>
			</h1>
			<p className="text-muted-foreground text-sm">
				<Trans>If the app did not open, try again on a device where it is installed.</Trans>
			</p>
			<a
				href="/auth/native-callback"
				className="inline-flex min-h-11 items-center underline underline-offset-4"
				onClick={(event) => {
					event.preventDefault();
					// Keep the authorization response out of rendered markup.
					window.location.assign(window.location.href);
				}}
			>
				<Trans>Try opening the app again</Trans>
			</a>
		</div>
	);
}
