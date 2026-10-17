import type { LetterPane } from "@/routes";
import type { PaneTab } from "@/shell/builder-chrome";
import { useLingui } from "@lingui/react/macro";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import PageScreen from "./page";
import { LetterConflictSheet, useLetterDraftOwner, useLetterStore } from "@/draft";
import { discardLetterDraft } from "@/features/letters/drafting";
import { LetterShareSheet } from "@/features/letters/share";
import { routes } from "@/routes";
import { BuilderChrome, useBuilderChrome } from "@/shell/builder-chrome";

/** Fills the chrome from the draft once for every pane: name and save status. */
function DraftChrome() {
	const name = useLetterStore((state) => state.document?.name);
	const status = useLetterStore((state) => state.status);
	const locked = useLetterStore((state) => state.locked);
	const retry = useLetterStore((state) => state.retry);
	useBuilderChrome({ title: name, save: name ? { status, locked, onRetry: retry } : undefined });
	return null;
}

/**
 * Cover letter editor. Phone: Write, Page and Design as bottom tabs (builder.html letters; no Check). Tablet: the
 * Write / Design panel with the Page beside it. Share opens Share & export (Download, History) as a sheet.
 */
export default function LetterLayout() {
	const { t } = useLingui();
	const { id } = useLocalSearchParams<{ id: string }>();
	const [sharing, setSharing] = useState(false);
	// The one owner of the letter draft; panes and the tablet page subscribe with `useLetterStore()`.
	useLetterDraftOwner(id);
	// An AI draft belongs to this visit: leaving or switching letters stops it.
	useEffect(() => () => discardLetterDraft(), [id]);

	const panes: PaneTab<LetterPane>[] = [
		{ pane: "write", label: t`Write`, icon: "pencil-simple", href: routes.letter(id, "write") },
		{ pane: "page", label: t`Page`, icon: "file-text", href: routes.letter(id, "page") },
		{ pane: "design", label: t`Design`, icon: "palette", href: routes.letter(id, "design") },
	];

	return (
		<BuilderChrome
			panes={panes}
			tabletPanes={["write", "design"]}
			page={<PageScreen />}
			title={t`Cover letter`}
			onShare={() => setSharing(true)}
		>
			<DraftChrome />
			<LetterConflictSheet />
			<LetterShareSheet id={id} open={sharing} onClose={() => setSharing(false)} />
		</BuilderChrome>
	);
}
