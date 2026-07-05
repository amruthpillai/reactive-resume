import { Separator } from "@reactive-resume/ui/components/separator";

const block: React.CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: 12,
	padding: 20,
	maxWidth: 360,
	fontSize: 13,
	color: "var(--foreground)",
};
const inline: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 12,
	padding: 20,
	fontSize: 13,
	color: "var(--muted-foreground)",
};

export const Horizontal = () => (
	<div style={block}>
		<div>
			<strong style={{ display: "block", fontSize: 14 }}>Amruth Pillai</strong>
			<span style={{ color: "var(--muted-foreground)" }}>Senior Software Engineer</span>
		</div>
		<Separator />
		<span style={{ color: "var(--muted-foreground)" }}>
			Building resume tooling at Reactive Resume. Open-source enthusiast.
		</span>
	</div>
);

export const Vertical = () => (
	<div style={inline}>
		<span>Profile</span>
		<Separator orientation="vertical" style={{ height: 16 }} />
		<span>Experience</span>
		<Separator orientation="vertical" style={{ height: 16 }} />
		<span>Education</span>
		<Separator orientation="vertical" style={{ height: 16 }} />
		<span>Skills</span>
	</div>
);
