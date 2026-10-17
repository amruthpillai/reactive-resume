import { useLingui } from "@lingui/react/macro";
import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useSession } from "@/auth/session";
import { useResumeStore } from "@/draft";
import { nativeEnvironment } from "@/draft/native";
import { ProposedEditsCaption, useMarkedResumeData } from "@/features/assistant/page-marks";
import { ResumePage } from "@/preview/page";
import { Banner } from "@/ui";

// Metro removes this branch and its require before collecting release dependencies.
const DevelopmentTools: typeof import("../../../scripts/parity/development").DevelopmentTools | null = __DEV__
	? require("../../../scripts/parity/development").DevelopmentTools
	: null;

export default function PageScreen() {
	const { t } = useLingui();
	const { id, parity, smoke } = useLocalSearchParams<{ id: string; parity?: string; smoke?: string }>();
	const developmentOrigin = parity ?? smoke;
	// The builder layout owns the draft; the page only reads it.
	const draft = useResumeStore();
	const session = useSession();
	const current = draft.document?.id === id;
	// The Assistant's pending edits, marked on the page (never saved).
	const marked = useMarkedResumeData(id, current ? draft.data : null);
	return (
		<View style={{ flex: 1 }}>
			<Stack.Screen options={{ title: t`Page`, headerTransparent: false }} />
			{DevelopmentTools && developmentOrigin ? (
				<DevelopmentTools id={id} origin={developmentOrigin} fullParity={!!parity} />
			) : null}
			{session.status === "signed-out" || session.status === "expired" ? (
				<Banner tone="warn" message={t`Sign in to view this resume.`} />
			) : draft.status === "error" && !current ? (
				<Banner
					tone="danger"
					message={t`Resume could not be loaded.`}
					action={{ label: t`Retry`, onPress: () => void draft.open(id).catch(() => undefined) }}
				/>
			) : null}
			<ProposedEditsCaption resumeId={id} pending={marked.pending} />
			<ResumePage
				id={id}
				draft={current ? draft : { ...draft, data: null }}
				previewData={marked.data}
				focused={nativeEnvironment.focused()}
			/>
		</View>
	);
}
