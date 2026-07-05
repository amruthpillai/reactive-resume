import { Spinner } from "@reactive-resume/ui/components/spinner";

const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 20, padding: 24 };

export const Sizes = () => (
	<div style={row}>
		<Spinner style={{ width: 16, height: 16 }} />
		<Spinner style={{ width: 24, height: 24 }} />
		<Spinner style={{ width: 32, height: 32 }} />
	</div>
);

export const Colors = () => (
	<div style={row}>
		<Spinner style={{ width: 28, height: 28, color: "var(--primary)" }} />
		<Spinner style={{ width: 28, height: 28, color: "var(--muted-foreground)" }} />
	</div>
);

export const LoadingRow = () => (
	<div
		style={{
			display: "flex",
			alignItems: "center",
			gap: 10,
			padding: 20,
			fontSize: 13,
			color: "var(--muted-foreground)",
		}}
	>
		<Spinner style={{ width: 18, height: 18 }} />
		<span>Generating your PDF…</span>
	</div>
);
