import type { LetterPane } from "@/routes";
import type { PaneTab } from "@/shell/builder-chrome";
import { useLingui } from "@lingui/react/macro";
import { useLocalSearchParams } from "expo-router";
import { LetterConflictSheet, useLetterDraftOwner } from "@/draft";
import { routes } from "@/routes";
import { BuilderChrome } from "@/shell/builder-chrome";

/** Cover letter editor: Write and Design panes, in the same chrome as the resume builder. */
export default function LetterLayout() {
	const { t } = useLingui();
	const { id } = useLocalSearchParams<{ id: string }>();
	// The one owner of the letter draft; Write and Design subscribe with `useLetterStore()`.
	useLetterDraftOwner(id);

	const panes: PaneTab<LetterPane>[] = [
		{ pane: "write", label: t`Write`, icon: "pencil-simple", href: routes.letter(id, "write") },
		{ pane: "design", label: t`Design`, icon: "palette", href: routes.letter(id, "design") },
	];

	return (
		<BuilderChrome panes={panes} tabletPanes={["write", "design"]} title={t`Cover letter`}>
			<LetterConflictSheet />
		</BuilderChrome>
	);
}
