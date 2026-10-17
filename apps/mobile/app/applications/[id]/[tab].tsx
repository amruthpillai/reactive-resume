import type { WorkspaceTab } from "@reactive-resume/schema/career";
import type { ComponentType } from "react";
import { useLingui } from "@lingui/react/macro";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ApplicationDetail } from "@/features/application-detail/detail-screen";
import { ApplyTab } from "@/features/workspace/tabs/apply";
import { DebriefTab } from "@/features/workspace/tabs/debrief";
import { FitTab } from "@/features/workspace/tabs/fit";
import { MessagesTab } from "@/features/workspace/tabs/messages";
import { PractiseTab } from "@/features/workspace/tabs/practise";
import { PrepareTab } from "@/features/workspace/tabs/prepare";
import { SavedTab } from "@/features/workspace/tabs/saved";
import { routes } from "@/routes";
import { Button } from "@/ui";

const WORKSPACE: Record<WorkspaceTab, ComponentType> = {
	fit: FitTab,
	apply: ApplyTab,
	prepare: PrepareTab,
	practise: PractiseTab,
	debrief: DebriefTab,
	messages: MessagesTab,
	saved: SavedTab,
};

/** `/applications/:id/details` is the application detail; the workspace tabs (`fit`, …) render their own screens. */
export default function ApplicationTabScreen() {
	const { t } = useLingui();
	const router = useRouter();
	const { id, tab } = useLocalSearchParams<{ id: string; tab: string }>();
	const Workspace = WORKSPACE[tab as WorkspaceTab] as ComponentType | undefined;
	if (!Workspace) return <ApplicationDetail id={id} />;

	// Rendered here (not passed as a component) so the button keeps the Lingui context; see reports/M1-T1.md.
	const details = (
		<Button variant="link" label={t`Details`} onPress={() => router.replace(routes.applicationDetails(id))} />
	);
	return (
		<>
			<Stack.Screen options={{ headerRight: () => details }} />
			<Workspace />
		</>
	);
}
