// The workspace Coach: chat about this job beside any tab (web workspace/coach-sheet.tsx, W19). The chat itself is
// the Assistant's embeddable `ChatView` (M6-T3, `src/features/assistant/chat-view.tsx`), not merged yet.
import type { Application } from "@/features/applications/types";
import type { WorkspaceTab } from "@reactive-resume/schema/career";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { View } from "react-native";
import { PrivacyLine, tabLabel } from "./parts";
import { AIProviderSetupSheet, useHasAIProvider } from "@/features/ai/providers";
import { Banner, Button, EmptyState, Sheet, Text, useTheme } from "@/ui";

/**
 * What the coach reads for this conversation, as web passes it: application-scoped threads
 * (`agent.threads.start({ scope: "application", applicationId })`), the posting, notes, documents sent and Knowledge,
 * with the current tab as a hint. Web research stays off unless the user turns it on.
 */
export type CoachContext = {
	scope: "application";
	applicationId: string;
	company: string;
	tab: WorkspaceTab;
	document: true;
	posting: true;
	application: true;
	memory: true;
	web: false;
};

type CoachSheetProps = { application: Application; tab: WorkspaceTab; open: boolean; onClose: () => void };

export function CoachSheet({ application, tab, open, onClose }: CoachSheetProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const providers = useHasAIProvider();
	const [setup, setSetup] = useState(false);
	const context: CoachContext = {
		scope: "application",
		applicationId: application.id,
		company: application.company,
		tab,
		document: true,
		posting: true,
		application: true,
		memory: true,
		web: false,
	};
	const company = application.company;
	const tabName = tabLabel(tab);
	const connection = providers.defaultProvider?.label ?? t`your AI connection`;

	return (
		<Sheet open={open} onClose={onClose} title={t`Coach`} detents={[0.9]}>
			<View style={{ gap: space.s3, paddingHorizontal: space.s4 }}>
				<Text variant="callout" color="ink3">
					{t`${company} · ${tabName}`}
				</Text>
				{providers.error ? (
					<Banner
						tone="danger"
						message={t`AI connections couldn't be loaded.`}
						action={{ label: t`Try again`, onPress: providers.retry }}
					/>
				) : !providers.isLoading && !providers.hasAIProvider ? (
					<>
						<Banner tone="warn" message={t`The coach needs an AI connection. Nothing is sent until you ask.`} />
						<Button label={t`Connect an AI provider`} onPress={() => setSetup(true)} />
					</>
				) : (
					// SEAM(M6-T3): replace <CoachChat> with `<ChatView context={context} … />` from
					// `@/features/assistant/chat-view` once M6-T3 merges. Keep the header, provider check and privacy line here.
					<CoachChat context={context} />
				)}
				<PrivacyLine>
					{t`Sends your message, this application (posting, notes, documents sent) and Knowledge that's switched on to ${connection}.`}
				</PrivacyLine>
			</View>
			<AIProviderSetupSheet open={setup} onClose={() => setSetup(false)} />
		</Sheet>
	);
}

/** Placeholder until the Assistant chat lands; it explains what the coach will read, and sends nothing. */
function CoachChat({ context }: { context: CoachContext }) {
	const { t } = useLingui();
	const tabName = tabLabel(context.tab);
	return (
		<EmptyState
			icon="sparkle"
			title={t`Ask anything about this job`}
			message={t`The coach reads the posting, your notes and what you sent, and knows you're on ${tabName}. Chat arrives with the Assistant.`}
		/>
	);
}
