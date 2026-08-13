import type { BuilderLayout } from "@/routes/builder/$resumeId/-store/sidebar";

type FocusPanel = {
	current: { resize(size: string): void } | null;
};

export type StylesheetFocusModeInput = {
	rightPanel: FocusPanel | null;
	currentLayout: BuilderLayout;
	setLayout(layout: BuilderLayout): void;
};

export function enterStylesheetFocusMode({
	rightPanel,
	currentLayout,
	setLayout,
}: StylesheetFocusModeInput): () => void {
	rightPanel?.current?.resize("45%");

	return () => {
		rightPanel?.current?.resize(`${currentLayout.right}%`);
		setLayout(currentLayout);
	};
}
