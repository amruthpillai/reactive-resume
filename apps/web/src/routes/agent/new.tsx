import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import { NewThreadSetup } from "./-components/new-thread-setup";
import { AgentThreadSidebar } from "./-components/thread-sidebar";

const searchSchema = z.object({ resumeId: z.string().optional() });

export const Route = createFileRoute("/agent/new")({
	component: RouteComponent,
	validateSearch: searchSchema,
});

function RouteComponent() {
	const { resumeId } = Route.useSearch();

	return (
		<div className="flex h-svh bg-background">
			<div className="w-72 shrink-0">
				<AgentThreadSidebar />
			</div>

			<main className="grid min-w-0 flex-1 overflow-auto">
				<NewThreadSetup resumeId={resumeId} />
			</main>
		</div>
	);
}
