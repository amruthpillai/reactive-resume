// The embeddable chat (wave 5 contract): the builder Assistant, Career → Coach and the workspace Coach sheet (M6-T2)
// render it with their own context. Ported from apps/web/src/features/assistant/conversation.tsx and
// apps/web/src/features/career/coach-thread.tsx.
import type { ChatAttachment, MessageContext } from "./chat";
import type { AssistantDocument } from "./document";
import type { EditStatus, ProposalHandlers } from "./messages";
import type { ToolPart } from "./proposals";
import type { IconName } from "@/ui";
import type { Proposal } from "@reactive-resume/resume/proposals";
import type { UIMessage } from "ai";
import type { ReactNode } from "react";
import type { ScrollViewInstance } from "react-native";
import { Trans, useLingui } from "@lingui/react/macro";
import { ORPCError } from "@orpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, ScrollView, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { attachmentPart, refreshThreads, transcriptOf, useAssistantChat } from "./chat";
import { FileChip, MessageView } from "./messages";
import { isProposeEdits, publishProposals, toProposals } from "./proposals";
import { recoverRun } from "./recovery";
import { client, orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { Button, Icon, Text, showToast, useTheme } from "@/ui";

export type { ChatAttachment, MessageContext } from "./chat";
export type { AssistantDocument } from "./document";

export type ChatViewProps = {
	/** The conversation, or null for a new one: the first message (or attachment) creates it through `createThread`. */
	threadId: string | null;
	createThread: () => Promise<string>;
	/** The first message created this conversation; show it from now on (pass it back as `threadId`). */
	onThreadCreated: (id: string) => void;
	/** Read at send time: the chips apply to the next message. */
	context: MessageContext;
	/** The open document: its change sets apply to the draft and are marked on Page. Null for the coach. */
	document: AssistantDocument | null;
	/** The provider, named in the error line: "OpenAI". */
	connection: string;
	/** Says what a send shares, under the composer. */
	privacy: string;
	placeholder: string;
	/** How a copied transcript names the other side: "Assistant" or "Coach". */
	assistantName: string;
	/** Context chips, before the attachments. */
	chips?: ReactNode;
	/** Shown while the conversation has no messages; `send` sends a starter. */
	empty?: (send: (text: string) => void) => ReactNode;
	/** Sent once, as soon as it can be (a question asked from another screen). */
	prompt?: string | null;
	onPromptSent?: () => void;
	/** Nothing can be sent (locked document, Knowledge still loading). */
	disabled?: boolean;
	/** Error line: Switch model. */
	onSwitchModel?: () => void;
	/** After each reply, for example to refresh Knowledge. */
	onFinish?: () => void;
};

type Prompt = { threadId: string; text: string; attachments: ChatAttachment[] };

const MAX_FILES = 10;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

/** One conversation (or a new one), its change sets and questions, and the composer. */
export function ChatView(props: ChatViewProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const [prompt, setPrompt] = useState<Prompt | null>(null);
	const [starting, setStarting] = useState(false);
	const draft = useRef<string | null>(null);
	const creating = useRef<Promise<string> | null>(null);

	// A conversation exists from its first message or attachment; one created for an attachment is reused.
	const ensureThread = (): Promise<string> => {
		if (props.threadId) return Promise.resolve(props.threadId);
		if (draft.current) return Promise.resolve(draft.current);
		creating.current ??= props
			.createThread()
			.then((id) => {
				draft.current = id;
				return id;
			})
			.finally(() => {
				creating.current = null;
			});
		return creating.current;
	};

	/** Resolves false when the conversation couldn't start, so the composer keeps the message. */
	const start = async (text: string, attachments: ChatAttachment[] = []) => {
		if (starting || props.disabled) return false;
		setStarting(true);
		try {
			const id = await ensureThread();
			setPrompt({ threadId: id, text, attachments });
			draft.current = null;
			props.onThreadCreated(id);
			return true;
		} catch (error) {
			showToast({ message: errorText(error, t`Couldn't start the conversation. Try again.`) });
			return false;
		} finally {
			setStarting(false);
		}
	};

	const startPrompt = useEffectEvent((text: string) => {
		props.onPromptSent?.();
		void start(text);
	});
	useEffect(() => {
		// oxlint-disable-next-line react/set-state-in-effect -- a question handed over from another screen starts its conversation (async: it creates the thread first)
		if (props.prompt && !props.disabled) startPrompt(props.prompt);
	}, [props.prompt, props.disabled]);

	if (!props.threadId)
		return (
			<KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
				<ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.s4, gap: space.s4 }}>
					<Empty render={props.empty} send={(text) => void start(text)} />
				</ScrollView>
				<Composer
					{...props}
					streaming={starting}
					disabled={props.disabled ?? false}
					ensureThread={ensureThread}
					onSend={start}
					onStop={() => undefined}
				/>
			</KeyboardAvoidingView>
		);

	return (
		<Session
			key={props.threadId}
			{...props}
			threadId={props.threadId}
			prompt={prompt?.threadId === props.threadId ? prompt : null}
			onPromptDelivered={() => setPrompt(null)}
		/>
	);
}

type EmptyProps = { render: ChatViewProps["empty"]; send: (text: string) => void };

/** The empty state as a component, so its send callback isn't treated as part of the render. */
function Empty({ render, send }: EmptyProps) {
	return render?.(send) ?? null;
}

type SessionProps = Omit<ChatViewProps, "threadId" | "prompt"> & {
	threadId: string;
	prompt: Prompt | null;
	onPromptDelivered: () => void;
};

/** Reads the conversation fresh when it opens (the chat takes its messages once); a brand-new one skips the read. */
function Session(props: SessionProps) {
	const { space } = useTheme();
	const session = useSession();
	const [fresh] = useState(() => props.prompt !== null);
	const options = orpc.agent.threads.get.queryOptions({ input: { id: props.threadId } });
	const thread = useQuery({
		...options,
		queryKey: [...options.queryKey, session.server],
		enabled: !fresh && session.status === "signed-in",
		refetchOnMount: "always",
	});

	if (fresh) return <Conversation {...props} initialMessages={[]} activeRun={false} readOnly={false} />;
	if (thread.data && thread.isFetchedAfterMount)
		return (
			<Conversation
				{...props}
				initialMessages={thread.data.messages as UIMessage[]}
				activeRun={Boolean(thread.data.thread.activeRunId)}
				readOnly={thread.data.isReadOnly}
			/>
		);
	return (
		<View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: space.s6 }}>
			{thread.error ? (
				<Text color="ink2" accessibilityRole="alert">
					<Trans>This conversation couldn't be opened.</Trans>
				</Text>
			) : (
				<ActivityIndicator />
			)}
		</View>
	);
}

type ConversationProps = SessionProps & { initialMessages: UIMessage[]; activeRun: boolean; readOnly: boolean };

function Conversation(props: ConversationProps) {
	const { threadId, document } = props;
	const { t } = useLingui();
	const { colors, radius, space } = useTheme();
	const queryClient = useQueryClient();
	const [statuses, setStatuses] = useState<ReadonlyMap<string, EditStatus>>(new Map());
	const [stopped, setStopped] = useState(false);
	const scroller = useRef<ScrollViewInstance>(null);
	const nearBottom = useRef(true);

	const refresh = () => {
		refreshThreads(queryClient);
		props.onFinish?.();
	};
	const chat = useAssistantChat({
		threadId,
		initialMessages: props.initialMessages,
		context: props.context,
		onFinish: refresh,
	});
	const {
		messages,
		sendMessage,
		setMessages,
		status,
		error,
		clearError,
		regenerate,
		stop,
		addToolOutput,
		resumeStream,
	} = chat;
	const streaming = status === "submitted" || status === "streaming";
	const readOnly = props.readOnly || props.disabled === true;

	// Each follow-up of a running reply belongs to one lifecycle generation. Unmounting, going to the background,
	// Stop and Send start a new one, and a follow-up checks its generation after every await before touching anything.
	const generation = useRef(0);
	const following = useRef(false);
	const detached = useRef(false);
	const moveOn = () => {
		generation.current++;
		following.current = false;
	};

	const deliver = (text: string, attachments: ChatAttachment[]) => {
		const files = attachments.map(attachmentPart);
		void sendMessage(files.length > 0 ? { text, files } : { text }, {
			body: { attachmentIds: attachments.map((attachment) => attachment.id) },
		});
		// The server titles the conversation from its first message.
		setTimeout(() => refreshThreads(queryClient), 1500);
	};

	const send = (text: string, attachments: ChatAttachment[] = []) => {
		if (streaming || readOnly) return false;
		moveOn();
		clearError();
		setStopped(false);
		deliver(text, attachments);
		return true;
	};

	// The first message of a new conversation goes out once the chat exists.
	const sendPrompt = useEffectEvent((prompt: Prompt) => {
		props.onPromptDelivered();
		deliver(prompt.text, prompt.attachments);
	});
	const sentPrompt = useRef(false);
	useEffect(() => {
		if (!props.prompt || sentPrompt.current) return;
		sentPrompt.current = true;
		sendPrompt(props.prompt);
	}, [props.prompt]);

	// A failed continuation (after an answer) is sent again as it was; regenerating would drop the answer.
	const retry = () => {
		moveOn();
		clearError();
		if (lastAssistantMessageIsCompleteWithToolCalls({ messages })) void sendMessage();
		else void regenerate();
	};

	const stopReply = () => {
		moveOn();
		setStopped(true);
		void client.agent.messages.stop({ threadId }).catch(() => undefined);
		void stop();
	};

	const recover = useEffectEvent(() => {
		const token = ++generation.current;
		const isCurrent = () => token === generation.current;
		following.current = true;
		void recoverRun({
			isCurrent,
			reload: async () => {
				const options = orpc.agent.threads.get.queryOptions({ input: { id: threadId } });
				const latest = await queryClient.fetchQuery({ ...options, staleTime: 0 }).catch(() => null);
				return latest && { messages: latest.messages as UIMessage[], active: Boolean(latest.thread.activeRunId) };
			},
			apply: (saved) => {
				clearError();
				setMessages(saved);
			},
			resume: () => resumeStream(),
		}).finally(() => {
			if (!isCurrent()) return;
			following.current = false;
			refreshThreads(queryClient);
		});
	});

	// A reply still running when the conversation opens is followed until it finishes (resume needs Redis).
	useEffect(() => {
		if (props.activeRun) recover();
		// The counter object itself, not a node: unmounting moves every follow-up on.
		const lifecycle = generation;
		return () => {
			lifecycle.current++;
		};
	}, [props.activeRun]);

	// In the background the OS may cut the connection, so the reply is detached here; the run goes on on the server.
	// Back in the foreground the thread is reloaded as the server saved it, and a run still going is followed again.
	const onAppState = useEffectEvent((state: string) => {
		if (state === "background") {
			if (!streaming && !following.current) return;
			detached.current = true;
			moveOn();
			if (streaming) void stop();
			return;
		}
		if (state !== "active" || (!detached.current && status !== "error")) return;
		detached.current = false;
		recover();
	});
	useEffect(() => {
		const subscription = AppState.addEventListener("change", onAppState);
		return () => subscription.remove();
	}, []);

	// ---- Proposed edits ----

	const proposals = useMemo(
		() =>
			document
				? messages.flatMap((message) =>
						message.parts.flatMap((part) => (isProposeEdits(part) ? toProposals(part, statuses) : [])),
					)
				: [],
		[messages, statuses, document],
	);
	// Kept after the assistant closes: Page marks them while they're pending.
	const documentId = document?.id;
	useEffect(() => {
		if (documentId) publishProposals(documentId, proposals);
	}, [documentId, proposals]);

	const record = (message: UIMessage, part: ToolPart, changed: readonly Proposal[], next: EditStatus) => {
		setStatuses((current) => new Map([...current, ...changed.map((proposal) => [proposal.id, next] as const)]));
		if (!part.toolCallId) return;
		void client.agent.messages
			.setEditStatus({
				threadId,
				messageId: message.id,
				toolCallId: part.toolCallId,
				edits: changed.map((proposal) => ({ id: proposal.id, status: next })),
			})
			.then(() => refreshThreads(queryClient))
			.catch(() => undefined);
	};
	const recordUndone = useEffectEvent(record);

	// Undoing an accepted edit (the toast's Undo, or undo in the editor) makes it pending again.
	useEffect(() => {
		if (!document) return;
		for (const message of messages)
			for (const part of message.parts) {
				if (!isProposeEdits(part)) continue;
				const undone = toProposals(part, statuses).filter(
					(proposal) => proposal.status === "accepted" && document.stateOf(proposal) === "pending",
				);
				// oxlint-disable-next-line react/set-state-in-effect -- an undo happens in the draft store; the new status is also saved to the thread
				if (undone.length > 0) recordUndone(message, part, undone, "pending");
			}
	}, [messages, statuses, document]);

	const handlers: ProposalHandlers | null = document
		? {
				statuses,
				stateOf: document.stateOf,
				locked: document.locked,
				onAccept: (message, part, chosen) => {
					document.accept(chosen);
					record(message, part, chosen, "accepted");
				},
				onReject: (message, part, chosen) => record(message, part, chosen, "rejected"),
			}
		: null;

	const last = messages.at(-1);
	const proposedInLast = last?.role === "assistant" && last.parts.some(isProposeEdits);

	const copyTranscript = async () => {
		try {
			await Clipboard.setStringAsync(
				transcriptOf(messages, { user: t`You`, assistant: props.assistantName, sources: t`Sources` }),
			);
			showToast({ message: t`Transcript copied` });
		} catch {
			showToast({ message: t`Couldn't copy the transcript.` });
		}
	};

	return (
		<KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
			<ScrollView
				ref={scroller}
				style={{ flex: 1 }}
				accessibilityLabel={t`Conversation`}
				contentContainerStyle={{ padding: space.s4, gap: space.s4 }}
				keyboardDismissMode="interactive"
				scrollEventThrottle={100}
				onScroll={({ nativeEvent }) => {
					const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
					nearBottom.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 120;
				}}
				// Follows the reply while it streams, unless the user scrolled up to read.
				onContentSizeChange={() => {
					if (nearBottom.current) scroller.current?.scrollToEnd({ animated: false });
				}}
			>
				{messages.length === 0 && !streaming ? <Empty render={props.empty} send={(text) => void send(text)} /> : null}
				{messages.map((message, index) => (
					<MessageView
						key={message.id}
						message={message}
						streaming={streaming && index === messages.length - 1}
						readOnly={readOnly}
						proposals={handlers}
						onAnswer={(toolCallId, answer) =>
							void addToolOutput({ tool: "ask_user_question", toolCallId, output: answer } as never)
						}
					/>
				))}

				{status === "submitted" ? (
					<View style={{ flexDirection: "row", alignItems: "center", gap: space.s2 }}>
						<ActivityIndicator size="small" />
						<Text variant="callout" color="ink3">
							<Trans>Thinking…</Trans>
						</Text>
					</View>
				) : null}

				{stopped && !streaming && !proposedInLast ? (
					<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.s2 }}>
						<Icon name="stop-circle" size={18} color={colors.ink3} />
						<Text variant="callout" color="ink2">
							{document ? <Trans>Stopped. No edits were proposed.</Trans> : <Trans>Stopped</Trans>}
						</Text>
						<Button variant="link" label={t`Continue`} disabled={readOnly} onPress={() => send(t`Continue`)} />
					</View>
				) : null}

				{error && !streaming ? (
					<View
						accessibilityRole="alert"
						style={{ gap: space.s2, padding: space.s3, borderRadius: radius.rXl, backgroundColor: colors.dangerSoft }}
					>
						<View style={{ flexDirection: "row", gap: space.s2 }}>
							<Icon name="warning-circle" size={18} color={colors.dangerText} />
							<Text variant="callout" color="dangerText" style={{ flex: 1 }}>
								<Trans>
									{props.connection} returned “{errorText(error, t`an error`)}”. Your message is kept.
								</Trans>
							</Text>
						</View>
						<View style={{ flexDirection: "row", gap: space.s2 }}>
							<Button size="sm" variant="secondary" icon="arrow-clockwise" label={t`Retry`} onPress={retry} />
							{props.onSwitchModel ? (
								<Button size="sm" variant="ghost" label={t`Switch model`} onPress={props.onSwitchModel} />
							) : null}
						</View>
					</View>
				) : null}

				{!streaming && messages.length > 0 ? (
					<Button variant="ghost" size="sm" icon="copy" label={t`Copy transcript`} onPress={copyTranscript} />
				) : null}
			</ScrollView>

			<Composer
				{...props}
				streaming={streaming}
				disabled={readOnly}
				ensureThread={() => Promise.resolve(threadId)}
				onSend={send}
				onStop={stopReply}
			/>
		</KeyboardAvoidingView>
	);
}

/** The server's reason when it gave one (a switched-off connection, a limit); otherwise the fallback. */
function errorText(error: unknown, fallback: string) {
	return error instanceof ORPCError && error.message ? error.message : fallback;
}

// ---- Composer ----

type Upload = ChatAttachment & { size: number; busy?: boolean };

type ComposerProps = Pick<ChatViewProps, "chips" | "privacy" | "placeholder"> & {
	streaming: boolean;
	disabled: boolean;
	ensureThread: () => Promise<string>;
	/** True once the message is on its way; false keeps it in the box. */
	onSend: (text: string, attachments: ChatAttachment[]) => boolean | Promise<boolean>;
	onStop: () => void;
};

/** Context chips and attachments, a box that grows to six lines, attach, and Send (Stop while a reply streams). */
function Composer(props: ComposerProps) {
	const { t } = useLingui();
	const { colors, radius, size, space, type } = useTheme();
	const [text, setText] = useState("");
	const [attachments, setAttachments] = useState<Upload[]>([]);
	const uploading = attachments.some((attachment) => attachment.busy);
	const hasText = text.trim().length > 0;

	const submit = async () => {
		const value = text.trim();
		if (!value || props.streaming || props.disabled || uploading) return;
		const sent = await props.onSend(
			value,
			attachments.map(({ id, filename, mediaType }) => ({ id, filename, mediaType })),
		);
		if (!sent) return;
		setText("");
		setAttachments([]);
	};

	const attach = async () => {
		const picked = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
		if (picked.canceled) return;
		// Sizes are checked before any file is read: 25 MB a file and 100 MB in all, the server's limits.
		let budget = MAX_TOTAL_BYTES - attachments.reduce((total, item) => total + item.size, 0);
		let room = MAX_FILES - attachments.length;
		const files: { asset: DocumentPicker.DocumentPickerAsset; key: string; size: number }[] = [];
		const skipped = { count: 0, big: false, total: false };
		for (const [index, asset] of picked.assets.entries()) {
			const size = asset.size ?? new File(asset.uri).size;
			if (room === 0) skipped.count++;
			else if (size > MAX_FILE_BYTES) skipped.big = true;
			else if (size > budget) skipped.total = true;
			else {
				files.push({ asset, key: `upload-${Date.now()}-${index}`, size });
				budget -= size;
				room--;
			}
		}
		if (skipped.count > 0) showToast({ message: t`Attach up to 10 files to a message.` });
		if (skipped.big) showToast({ message: t`Files can be up to 25 MB each.` });
		if (skipped.total) showToast({ message: t`Attachments can be up to 100 MB in all.` });
		if (files.length === 0) return;
		setAttachments((current) => [
			...current,
			...files.map(({ asset, key, size }) => ({
				id: key,
				filename: asset.name,
				mediaType: asset.mimeType ?? "application/octet-stream",
				size,
				busy: true,
			})),
		]);
		const drop = (key: string) => setAttachments((current) => current.filter((item) => item.id !== key));
		let threadId: string;
		try {
			threadId = await props.ensureThread();
		} catch (error) {
			for (const { key } of files) drop(key);
			showToast({ message: errorText(error, t`Couldn't attach the file.`) });
			return;
		}
		// One file at a time: only one base64 copy is in memory at once.
		for (const { asset, key } of files) {
			try {
				const attachment = await client.agent.attachments.create({
					threadId,
					filename: asset.name,
					mediaType: asset.mimeType ?? "application/octet-stream",
					data: await new File(asset.uri).base64(),
				});
				setAttachments((current) =>
					current.map((item) =>
						item.id === key
							? { id: attachment.id, filename: attachment.filename, mediaType: attachment.mediaType, size: item.size }
							: item,
					),
				);
			} catch (error) {
				drop(key);
				showToast({ message: errorText(error, t`Couldn't attach the file.`) });
			}
		}
	};

	const sendDisabled = !props.streaming && (!hasText || props.disabled || uploading);

	return (
		<View
			style={{
				gap: space.s2,
				paddingHorizontal: space.s3,
				paddingTop: space.s2,
				paddingBottom: space.s3,
				borderTopWidth: 1,
				borderColor: colors.line,
				backgroundColor: colors.surface,
			}}
		>
			{props.chips || attachments.length > 0 ? (
				<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2 }} accessibilityLabel={t`Context`}>
					{props.chips}
					{attachments.map((attachment) => (
						<FileChip
							key={attachment.id}
							name={attachment.filename}
							busy={attachment.busy}
							onRemove={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}
						/>
					))}
				</View>
			) : null}

			<View
				style={{
					flexDirection: "row",
					alignItems: "flex-end",
					gap: space.s1,
					padding: space.s1,
					borderRadius: radius.rXl,
					borderWidth: 1,
					borderColor: colors.line2,
					backgroundColor: colors.raised,
					opacity: props.disabled ? 0.6 : 1,
				}}
			>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={t`Attach a file`}
					accessibilityState={{ disabled: props.disabled || uploading }}
					disabled={props.disabled || uploading}
					onPress={() => void attach()}
					style={{ width: size.hit, height: size.hit, alignItems: "center", justifyContent: "center" }}
				>
					<Icon name="paperclip" size={22} color={colors.ink2} />
				</Pressable>
				<TextInput
					value={text}
					onChangeText={setText}
					editable={!props.disabled}
					multiline
					accessibilityLabel={t`Message the assistant`}
					placeholder={props.placeholder}
					placeholderTextColor={colors.ink3}
					style={{
						...type.body,
						flex: 1,
						color: colors.ink,
						minHeight: size.hit,
						maxHeight: type.body.lineHeight * 6 + space.s4,
						paddingVertical: space.s3,
						textAlignVertical: "top",
					}}
				/>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={props.streaming ? t`Stop` : t`Send`}
					accessibilityState={{ disabled: sendDisabled }}
					disabled={sendDisabled}
					onPress={props.streaming ? props.onStop : () => void submit()}
					style={{ width: size.hit, height: size.hit, alignItems: "center", justifyContent: "center" }}
				>
					<View
						style={{
							width: 34,
							height: 34,
							borderRadius: radius.rPill,
							alignItems: "center",
							justifyContent: "center",
							backgroundColor: props.streaming ? colors.ink : hasText ? colors.accent : colors.sunken,
						}}
					>
						<Icon
							name={props.streaming ? "stop" : "arrow-up"}
							size={props.streaming ? 16 : 18}
							color={props.streaming ? colors.bg : hasText ? colors.onAccent : colors.ink3}
						/>
					</View>
				</Pressable>
			</View>

			<Text variant="caption" color="ink3" style={{ paddingHorizontal: space.s1 }}>
				{props.privacy}
			</Text>
		</View>
	);
}

type ContextChipProps = {
	icon: IconName;
	label: string;
	/** A removable chip (what this message shares); without it the chip toggles. */
	onRemove?: () => void;
	removeLabel?: string;
	/** Toggle chips (the coach's): on or off. */
	pressed?: boolean;
	onPress?: () => void;
};

/** A context chip: removing one (×) leaves it out of what's sent; the coach's toggle on and off. */
export function ContextChip({ icon, label, onRemove, removeLabel, pressed, onPress }: ContextChipProps) {
	const { colors, radius, space } = useTheme();
	const toggle = onPress !== undefined;
	const on = !toggle || pressed;
	return (
		<Pressable
			accessibilityRole={toggle ? "switch" : "text"}
			accessibilityState={toggle ? { checked: !!pressed } : {}}
			accessibilityLabel={label}
			onPress={onPress}
			disabled={!toggle}
			hitSlop={8}
			style={{
				flexDirection: "row",
				alignItems: "center",
				gap: space.s1,
				minHeight: 28,
				maxWidth: 200,
				paddingStart: space.s2,
				paddingEnd: onRemove ? 0 : space.s2,
				borderRadius: radius.rMd,
				borderWidth: toggle ? 1 : 0,
				borderColor: on ? colors.accent : colors.line2,
				backgroundColor: toggle ? (on ? colors.accentSoft : "transparent") : colors.sunken,
			}}
		>
			<Icon name={icon} size={14} color={toggle && on ? colors.accentText : colors.ink2} />
			<Text
				variant="caption"
				color={toggle ? (on ? "accentText" : "ink3") : "ink2"}
				numberOfLines={1}
				style={{ flexShrink: 1 }}
			>
				{label}
			</Text>
			{onRemove ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={removeLabel ?? label}
					onPress={onRemove}
					hitSlop={8}
					style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}
				>
					<Icon name="x" size={12} color={colors.ink3} />
				</Pressable>
			) : null}
		</Pressable>
	);
}
