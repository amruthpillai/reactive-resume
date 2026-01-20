import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
	PaperPlaneRightIcon,
	SparkleIcon,
	XCircleIcon,
	XIcon,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useResumeStore } from "@/components/resume/store/resume";
import { useAIStore } from "@/integrations/ai/store";
import { client } from "@/integrations/orpc/client";
import { cn } from "@/utils/style";
import { useAIChatStore } from "../-store/ai-chat";

type AIChatResponse = {
	reply: string;
	changes?: {
		summary?: {
			content?: string | null;
		};
	};
};

const FAB_TIMEOUT_MS = 60_000;

export function AIChatPanel() {
	const aiEnabled = useAIStore((state) => state.enabled);
	const aiConfig = useAIStore((state) => ({
		provider: state.provider,
		model: state.model,
		apiKey: state.apiKey,
		baseURL: state.baseURL,
	}));

	const { resumeId } = useParams({ from: "/builder/$resumeId" });
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const { isOpen, fabVisible, lastInteraction, messages, toggle, close, hideFab, addMessage, touch } =
		useAIChatStore();

	const [input, setInput] = useState("");

	const canSend = useMemo(() => aiEnabled && input.trim().length > 0, [aiEnabled, input]);

	const { mutateAsync: sendMessage, isPending } = useMutation({
		mutationFn: async (payload: { message: string }) => {
			return client.ai.chat({
				aiStoreData: aiConfig,
				resumeId,
				message: payload.message,
			}) as Promise<AIChatResponse>;
		},
		onSuccess: (data) => {
			addMessage({ role: "assistant", content: data.reply });

			const summary = data.changes?.summary?.content;
			if (summary) {
				updateResumeData((draft) => {
					draft.summary.content = summary;
				});
				touch();
				toast.success(t`Applied AI suggestion to your summary.`);
			}
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	useEffect(() => {
		if (!fabVisible || isOpen) return;
		const last = lastInteraction ?? Date.now();
		const remaining = Math.max(0, FAB_TIMEOUT_MS - (Date.now() - last));
		const timer = setTimeout(() => {
			if (!useAIChatStore.getState().isOpen) hideFab();
		}, remaining);

		return () => clearTimeout(timer);
	}, [fabVisible, hideFab, isOpen, lastInteraction]);

	if (!aiEnabled) return null;

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!canSend) return;

		const message = input.trim();
		setInput("");

		addMessage({ role: "user", content: message });
		touch();

		await sendMessage({ message });
	};

	return (
		<>
			<AnimatePresence>
				{isOpen ? (
					<motion.aside
						key="ai-chat-panel"
						initial={{ opacity: 0, y: 48 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 48 }}
						transition={{ duration: 0.2 }}
						className="fixed bottom-24 right-4 top-20 z-30 flex w-[380px] max-w-[90vw] flex-col rounded-xl border bg-popover shadow-xl"
					>
						<header className="flex items-center justify-between border-b px-4 py-3">
							<div className="flex items-center gap-x-2 text-sm font-semibold">
								<SparkleIcon className="text-primary" />
								<span>
									<Trans>Build with AI</Trans>
								</span>
							</div>
							<Button size="icon" variant="ghost" onClick={() => close()}>
								<XIcon />
							</Button>
						</header>

						<div className="flex-1 overflow-hidden">
							<ScrollArea className="h-full px-4 py-3">
								<div className="space-y-3">
									{messages.map((message) => (
										<div
											key={message.id}
											className={cn(
												"rounded-lg border px-3 py-2 text-sm",
												message.role === "assistant" ? "bg-muted" : "bg-primary/10",
											)}
										>
											<p className="whitespace-pre-wrap leading-relaxed text-foreground">{message.content}</p>
										</div>
									))}
								</div>
							</ScrollArea>
						</div>

						<form onSubmit={handleSubmit} className="space-y-2 border-t px-4 py-3">
							<Textarea
								minLength={1}
								rows={3}
								value={input}
								placeholder={t`Tell me what to change in your resume...`}
								onChange={(event) => setInput(event.target.value)}
							/>
							<div className="flex items-center justify-between gap-2">
								<div className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
									<SparkleIcon className="text-primary" />
									<span className="truncate">{aiConfig.model || t`Model not set`}</span>
								</div>
								<Button type="submit" disabled={!canSend || isPending}>
									{isPending ? <XCircleIcon className="animate-pulse" /> : <PaperPlaneRightIcon />}
									<Trans>Send</Trans>
								</Button>
							</div>
						</form>
					</motion.aside>
				) : null}
			</AnimatePresence>

			{fabVisible ? (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 20 }}
					className="pointer-events-none fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2"
				>
					<Button
						size="icon"
						variant="default"
						className="pointer-events-auto shadow-lg"
						onClick={() => {
							toggle();
							touch();
						}}
					>
						<SparkleIcon />
					</Button>
				</motion.div>
			) : null}
		</>
	);
}
