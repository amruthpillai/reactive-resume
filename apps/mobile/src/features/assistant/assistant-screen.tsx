import type { MessageContext, ThreadSummary } from "./chat";
import type { AssistantDocument } from "./document";
import type { IconName } from "@/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { router } from "expo-router";
import { useEffect, useEffectEvent, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThreads } from "./chat";
import { ChatView, ContextChip } from "./chat-view";
import { useOpenResumeDraft, useResumeAssistantDocument } from "./document";
import { publishProposals } from "./proposals";
import { ModelButton, ModelSheet, ProviderGate, useConversationProvider } from "./provider";
import { PastConversations } from "./threads";
import { client } from "@/api/client";
import { useHasAIProvider } from "@/features/ai/providers";
import { routes } from "@/routes";
import { Banner, Icon, IconButton, Text, useTheme } from "@/ui";

export type AssistantScreenProps = {
	resumeId: string;
	/** A conversation to open (another document's row in Past conversations opens it here). */
	threadId?: string | undefined;
	/** A question to send in a new conversation as soon as the assistant can. */
	ask?: string | undefined;
	/** Prepare for next step: the application's suggestions (fit, follow-up, interview). */
	prepare?: boolean | undefined;
	/** The application this resume was opened for. */
	applicationId?: string | undefined;
};

/** Another document's conversation opens that document, with the Assistant on it. */
function openElsewhere(thread: ThreadSummary) {
	if (thread.workingResumeId && !thread.coverLetterId) {
		router.replace(routes.builder(thread.workingResumeId));
		router.push({ pathname: routes.assistant(thread.workingResumeId), params: { thread: thread.id } });
	}
	// Letters have no assistant on mobile yet: open the letter itself.
	else if (thread.coverLetterId) router.replace(routes.letter(thread.coverLetterId));
}

const belongsTo = (thread: ThreadSummary, document: AssistantDocument) =>
	document.kind === "letter"
		? thread.coverLetterId === document.id
		: thread.workingResumeId === document.id && !thread.coverLetterId;

/**
 * The builder's Assistant, full screen over the builder: it knows the open resume and the posting it's for, proposes
 * edits as cards (marked on Page), and asks before writing anything the resume doesn't say.
 */
export function AssistantScreen(props: AssistantScreenProps) {
	const { t } = useLingui();
	const { colors, space } = useTheme();
	const draft = useOpenResumeDraft(props.resumeId);
	const document = useResumeAssistantDocument(props.resumeId, props.applicationId);
	const providers = useHasAIProvider();
	const threads = useThreads();
	// null: the document's latest conversation; "new": a new one.
	const [selected, setSelected] = useState<string | null>(
		props.ask || props.prepare ? "new" : (props.threadId ?? null),
	);
	const [ask, setAsk] = useState(props.ask ?? null);
	const [prepare, setPrepare] = useState(props.prepare ?? false);
	const [view, setView] = useState<"thread" | "history">("thread");
	const [modelOpen, setModelOpen] = useState(false);
	const [context, setContext] = useState<MessageContext>({ document: true, posting: true });
	const [draftKey, setDraftKey] = useState(0);

	const mine = document ? (threads.data ?? []).filter((thread) => belongsTo(thread, document)) : [];
	const threadId = selected === "new" ? null : (selected ?? mine[0]?.id ?? null);
	const summary = threads.data?.find((thread) => thread.id === threadId);
	const { provider, label, choose } = useConversationProvider(providers, summary, threadId);

	const newConversation = () => {
		publishProposals(props.resumeId, []);
		setDraftKey((key) => key + 1);
		setContext({ document: true, posting: true });
		setSelected("new");
		setView("thread");
	};

	const openThread = (thread: ThreadSummary) => {
		if (!document || !belongsTo(thread, document)) return openElsewhere(thread);
		setSelected(thread.id);
		setView("thread");
	};

	// A `?thread=` link shows its chat (and Accept) only for a conversation about this resume; one about another
	// document opens that document, and an unknown one is refused.
	const linked = selected !== null && selected === props.threadId ? selected : null;
	const linkedThread = linked ? threads.data?.find((thread) => thread.id === linked) : undefined;
	const link =
		!linked || !document || !threads.data
			? "ok"
			: !linkedThread
				? "missing"
				: belongsTo(linkedThread, document)
					? "ok"
					: "elsewhere";
	const openLinked = useEffectEvent((thread: ThreadSummary) => openElsewhere(thread));
	useEffect(() => {
		if (link === "elsewhere" && linkedThread) openLinked(linkedThread);
	}, [link, linkedThread]);

	const body = draft.failed ? (
		<View style={{ padding: space.s4 }}>
			<Banner
				tone="danger"
				message={t`Resume could not be loaded.`}
				action={{ label: t`Retry`, onPress: draft.retry }}
			/>
		</View>
	) : !document || link === "elsewhere" ? (
		<View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.s2 }}>
			<ActivityIndicator />
			<Text color="ink2">
				<Trans>Opening the resume…</Trans>
			</Text>
		</View>
	) : link === "missing" && view !== "history" ? (
		<View style={{ padding: space.s4 }}>
			<Banner
				tone="warn"
				message={t`This conversation couldn't be opened.`}
				action={{ label: t`New conversation`, onPress: () => setSelected("new") }}
			/>
		</View>
	) : view === "history" ? (
		<PastConversations
			threads={threads.data ?? []}
			isMine={(thread) => belongsTo(thread, document)}
			currentId={threadId}
			onOpen={openThread}
			onDeleted={(id) => {
				if (id === threadId) setSelected("new");
			}}
		/>
	) : (
		<ChatView
			key={draftKey}
			threadId={threadId}
			createThread={async () =>
				(
					await client.agent.threads.start({
						resumeId: document.id,
						...(provider ? { aiProviderId: provider.id } : {}),
					})
				).id
			}
			onThreadCreated={(id) => {
				setSelected(id);
				setPrepare(false);
				void threads.refetch();
			}}
			context={{ ...context, ...(document.posting ? { applicationId: document.posting.id } : {}) }}
			document={document}
			connection={label}
			privacy={disclosure(t, document, context, label)}
			placeholder={t`Ask, or describe a change…`}
			assistantName={t`Assistant`}
			disabled={document.locked}
			prompt={ask}
			onPromptSent={() => setAsk(null)}
			onSwitchModel={() => setModelOpen(true)}
			chips={
				<>
					{context.document ? (
						<ContextChip
							icon="file-text"
							label={document.name}
							removeLabel={t`Don't send ${document.name}`}
							onRemove={() => setContext({ ...context, document: false })}
						/>
					) : null}
					{context.posting && document.posting ? (
						<ContextChip
							icon="briefcase"
							label={t`${document.posting.company} posting`}
							removeLabel={t`Don't send ${document.posting.company} posting`}
							onRemove={() => setContext({ ...context, posting: false })}
						/>
					) : null}
				</>
			}
			empty={(send) => <Suggestions document={document} prepare={prepare} onPick={send} />}
		/>
	);

	const gate = (
		<ProviderGate
			providers={providers}
			threadsError={threads.error}
			loading={threads.isPending}
			onRetry={() => {
				providers.retry();
				void threads.refetch();
			}}
			notSetUp={t`The assistant isn't set up on this server. Whoever runs it needs to set ENCRYPTION_SECRET. Everything else works without it.`}
		>
			{body}
		</ProviderGate>
	);

	return (
		<SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.surface }}>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					minHeight: 52,
					paddingStart: space.s3,
					paddingEnd: space.s1,
					borderBottomWidth: 1,
					borderColor: colors.line,
				}}
			>
				<Icon name="sparkle" size={20} color={colors.accent} />
				<View style={{ flex: 1, paddingStart: space.s2 }}>
					<Text variant="title" accessibilityRole="header">
						<Trans>Assistant</Trans>
					</Text>
					{providers.hasAIProvider ? (
						<ModelButton label={provider?.model ?? label} onPress={() => setModelOpen(true)} />
					) : null}
				</View>
				<IconButton icon="note-pencil" label={t`New conversation`} onPress={newConversation} />
				<IconButton
					icon="clock-counter-clockwise"
					label={t`Past conversations`}
					selected={view === "history"}
					onPress={() => setView(view === "history" ? "thread" : "history")}
				/>
				<IconButton icon="x" label={t`Close the assistant`} onPress={() => router.back()} />
			</View>

			{gate}

			<ModelSheet
				open={modelOpen}
				onClose={() => setModelOpen(false)}
				providers={providers.usableProviders}
				currentId={provider?.id}
				onChoose={(id) => void choose(id)}
			/>
		</SafeAreaView>
	);
}

type Translate = ReturnType<typeof useLingui>["t"];

/** What a send shares, and with whom (web's disclosure line). */
function disclosure(t: Translate, document: AssistantDocument, context: MessageContext, provider: string) {
	const posting = context.posting && document.posting;
	const sends = context.document
		? posting
			? t`Sends this resume and the posting to ${provider} with your key, only when you press send.`
			: t`Sends this resume to ${provider} with your key, only when you press send.`
		: posting
			? t`Sends your message and the posting to ${provider} with your key, only when you press send.`
			: t`Sends your message to ${provider} with your key, only when you press send.`;
	const history =
		!context.document || !context.posting
			? t`Each send starts fresh with this message and selected files. Previous conversation history stays here.`
			: t`Previous messages, including document details, are also sent.`;
	return `${sends} ${history}`;
}

type Suggestion = { icon: IconName; label: string; hint: string };

type SuggestionsProps = { document: AssistantDocument; prepare: boolean; onPick: (text: string) => void };

/** "What should we work on?" with starters that send at once. */
function Suggestions({ document, prepare, onPick }: SuggestionsProps) {
	const { t } = useLingui();
	const { colors, radius, space } = useTheme();
	const company = document.posting?.company;
	const tailor: Suggestion[] = company
		? [{ icon: "briefcase", label: t`Tailor to the ${company} posting`, hint: t`Uses the linked application` }]
		: [];
	const suggestions: Suggestion[] =
		prepare && company
			? [
					{ icon: "briefcase", label: t`How well do I fit this role?`, hint: t`Compares your resume with the posting` },
					{ icon: "envelope-simple", label: t`Draft a follow-up email`, hint: t`Short and polite, for the recruiter` },
					{
						icon: "chat-text",
						label: t`Prepare me for the interview`,
						hint: t`Likely questions, from the posting and your resume`,
					},
					...tailor,
				]
			: [
					...tailor,
					{ icon: "scissors", label: t`Find weak bullets`, hint: t`Checks every bullet for action and result` },
					{
						icon: "arrows-in-line-vertical",
						label: t`Tighten to one page`,
						hint: t`Suggests cuts, never deletes on its own`,
					},
					{ icon: "text-align-left", label: t`Draft a summary`, hint: t`From your experience entries` },
				];

	return (
		<View style={{ gap: space.s4, paddingTop: space.s4 }}>
			<View style={{ gap: space.s2 }}>
				<Text variant="heading" accessibilityRole="header">
					<Trans>What should we work on?</Trans>
				</Text>
				<Text color="ink2">
					{company ? (
						<Trans>
							I can see this resume and the {company} posting. Suggestions come back as edits you can accept one by one.
						</Trans>
					) : (
						<Trans>I can see this resume. Suggestions come back as edits you can accept one by one.</Trans>
					)}
				</Text>
				{document.locked ? (
					<Text variant="callout" color="warnText">
						<Trans>This document is locked. Unlock it to get suggestions.</Trans>
					</Text>
				) : null}
			</View>
			<View style={{ gap: space.s2 }}>
				{suggestions.map((suggestion) => (
					<Pressable
						key={suggestion.label}
						accessibilityRole="button"
						accessibilityHint={suggestion.hint}
						disabled={document.locked}
						onPress={() => onPick(suggestion.label)}
						style={({ pressed }) => ({
							flexDirection: "row",
							alignItems: "center",
							gap: space.s3,
							minHeight: 52,
							paddingHorizontal: space.s3,
							paddingVertical: space.s2,
							borderWidth: 1,
							borderColor: colors.line,
							borderRadius: radius.rLg,
							backgroundColor: pressed ? colors.press : "transparent",
							opacity: document.locked ? 0.45 : 1,
						})}
					>
						<Icon name={suggestion.icon} size={20} color={colors.ink2} />
						<View style={{ flex: 1 }}>
							<Text variant="label" numberOfLines={1}>
								{suggestion.label}
							</Text>
							<Text variant="caption" color="ink3" numberOfLines={1}>
								{suggestion.hint}
							</Text>
						</View>
					</Pressable>
				))}
			</View>
		</View>
	);
}
