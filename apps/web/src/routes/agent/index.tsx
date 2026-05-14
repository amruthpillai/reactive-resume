import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon, ChatCircleDotsIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@reactive-resume/ui/components/button";
import { AgentThreadSidebar } from "./-components/thread-sidebar";

export const Route = createFileRoute("/agent/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex h-svh bg-background">
			<div className="w-72 shrink-0">
				<AgentThreadSidebar />
			</div>

			<main className="grid min-w-0 flex-1 place-items-center p-6">
				<div className="w-full max-w-xl rounded-md border bg-card p-6 shadow-sm">
					<div className="flex items-start gap-4">
						<div className="grid size-11 shrink-0 place-items-center rounded-md border bg-background">
							<ChatCircleDotsIcon className="size-5" weight="fill" />
						</div>
						<div className="min-w-0 space-y-2">
							<h1 className="font-semibold text-2xl tracking-tight">
								<Trans>Select a thread</Trans>
							</h1>
							<p className="text-muted-foreground text-sm">
								<Trans>Choose an existing conversation from the sidebar, or start a new draft-focused thread.</Trans>
							</p>
						</div>
					</div>

					<div className="mt-6 flex justify-end border-t pt-4">
						<Button nativeButton={false} render={<Link to="/agent/new" />}>
							<ArrowRightIcon />
							<Trans>Start new thread</Trans>
						</Button>
					</div>
				</div>
			</main>
		</div>
	);
}
