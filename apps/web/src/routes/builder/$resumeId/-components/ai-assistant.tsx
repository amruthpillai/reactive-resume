import type { ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { GearSixIcon, SparkleIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@reactive-resume/ui/components/button";
import { Sheet, SheetContent, SheetTitle } from "@reactive-resume/ui/components/sheet";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { useHasUsableAiProvider } from "@/features/settings/integrations/hooks/use-has-usable-ai-provider";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";
import { AgentChat } from "@/routes/agent/-components/agent-chat";

type BuilderAiAssistantProps = {
	resumeId: string;
};

type AiAssistantThreadProps = {
	threadId: string;
	onClose: () => void;
};

function CenteredState({ children }: { children: ReactNode }) {
	return <div className="grid h-full place-items-center p-6 text-center text-muted-foreground text-sm">{children}</div>;
}

function NoProviderHint() {
	return (
		<div className="grid h-full place-items-center p-6">
			<div className="max-w-xs space-y-4 text-center">
				<SparkleIcon className="mx-auto size-8 text-muted-foreground" />
				<p className="text-muted-foreground text-sm">
					<Trans>Set up an AI provider to chat about this resume and apply edits automatically.</Trans>
				</p>
				<Button nativeButton={false} render={<Link to="/dashboard/settings/integrations" />}>
					<GearSixIcon />
					<Trans>Set up an AI provider</Trans>
				</Button>
			</div>
		</div>
	);
}

// Loads the full thread detail (messages, actions) once the in-place thread is resolved, then mounts the shared
// agent chat. The builder's own resume-update subscription applies the agent's server-side patches to the live
// store, so edits appear in the preview and undo/version history without any extra wiring here.
function AiAssistantThread({ threadId, onClose }: AiAssistantThreadProps) {
	const { data, isLoading, error } = useQuery(orpc.agent.threads.get.queryOptions({ input: { id: threadId } }));

	if (isLoading || !data) {
		return <CenteredState>{error ? <Trans>This assistant could not be opened.</Trans> : <Spinner />}</CenteredState>;
	}

	const readOnlyReason: "archived" | "missing" | null = data.isReadOnly
		? data.thread.status === "archived"
			? "archived"
			: "missing"
		: null;

	return (
		<AgentChat
			threadId={threadId}
			initialMessages={data.messages}
			isReadOnly={data.isReadOnly}
			readOnlyReason={readOnlyReason}
			threadStatus={data.thread.status}
			activeRunId={data.thread.activeRunId}
			actions={data.actions}
			onClose={onClose}
		/>
	);
}

function AiAssistantPanel({ resumeId, onClose }: BuilderAiAssistantProps & { onClose: () => void }) {
	const { hasUsableProvider, isLoading } = useHasUsableAiProvider();
	const getOrCreate = useMutation(orpc.agent.threads.getOrCreateForResume.mutationOptions());
	const [threadId, setThreadId] = useState<string | null>(null);
	const [setupFailed, setSetupFailed] = useState(false);
	const startedRef = useRef(false);

	// Resolve (or create) the in-place assistant thread once, the first time the panel opens with a usable provider.
	useEffect(() => {
		if (!hasUsableProvider || startedRef.current) return;
		startedRef.current = true;
		getOrCreate.mutate(
			{ resumeId },
			{
				onSuccess: (thread) => setThreadId(thread.id),
				onError: (mutationError) => {
					setSetupFailed(true);
					toast.error(getOrpcErrorMessage(mutationError, { fallback: t`Failed to start the AI assistant.` }));
				},
			},
		);
	}, [hasUsableProvider, resumeId, getOrCreate]);

	if (isLoading)
		return (
			<CenteredState>
				<Spinner />
			</CenteredState>
		);
	if (!hasUsableProvider) return <NoProviderHint />;
	if (setupFailed)
		return (
			<CenteredState>
				<Trans>Failed to start the AI assistant.</Trans>
			</CenteredState>
		);
	if (!threadId)
		return (
			<CenteredState>
				<Spinner />
			</CenteredState>
		);

	return <AiAssistantThread threadId={threadId} onClose={onClose} />;
}

export function BuilderAiAssistant({ resumeId }: BuilderAiAssistantProps) {
	const [open, setOpen] = useState(false);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<Button
				size="icon"
				variant="ghost"
				aria-label={t`Open AI assistant`}
				aria-pressed={open}
				onClick={() => setOpen(true)}
			>
				<SparkleIcon weight={open ? "fill" : "regular"} />
			</Button>

			<SheetContent
				side="right"
				showCloseButton={false}
				className="w-full max-w-full gap-0 p-0 sm:max-w-md md:max-w-lg"
			>
				<SheetTitle className="sr-only">
					<Trans>AI assistant</Trans>
				</SheetTitle>
				{/* Remount per open so a fresh thread is resolved and stale chat state is dropped. */}
				{open ? <AiAssistantPanel resumeId={resumeId} onClose={() => setOpen(false)} /> : null}
			</SheetContent>
		</Sheet>
	);
}
