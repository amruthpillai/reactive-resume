import { Kbd, KbdGroup } from "@reactive-resume/ui/components/kbd";

const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: 20 };
const listRow: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 24,
	fontSize: 13,
	color: "var(--foreground)",
};
const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 10, padding: 20, minWidth: 260 };

export const Keys = () => (
	<div style={row}>
		<Kbd>⌘</Kbd>
		<Kbd>⇧</Kbd>
		<Kbd>⌥</Kbd>
		<Kbd>Esc</Kbd>
		<Kbd>Enter</Kbd>
		<Kbd>Tab</Kbd>
	</div>
);

export const Combinations = () => (
	<div style={row}>
		<KbdGroup>
			<Kbd>⌘</Kbd>
			<Kbd>K</Kbd>
		</KbdGroup>
		<KbdGroup>
			<Kbd>⌘</Kbd>
			<Kbd>S</Kbd>
		</KbdGroup>
		<KbdGroup>
			<Kbd>⌘</Kbd>
			<Kbd>⇧</Kbd>
			<Kbd>P</Kbd>
		</KbdGroup>
	</div>
);

export const ShortcutList = () => (
	<div style={col}>
		<div style={listRow}>
			<span>Command palette</span>
			<KbdGroup>
				<Kbd>⌘</Kbd>
				<Kbd>K</Kbd>
			</KbdGroup>
		</div>
		<div style={listRow}>
			<span>Save resume</span>
			<KbdGroup>
				<Kbd>⌘</Kbd>
				<Kbd>S</Kbd>
			</KbdGroup>
		</div>
		<div style={listRow}>
			<span>Undo</span>
			<KbdGroup>
				<Kbd>⌘</Kbd>
				<Kbd>Z</Kbd>
			</KbdGroup>
		</div>
	</div>
);
