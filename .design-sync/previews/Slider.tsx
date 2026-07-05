import { Label } from "@reactive-resume/ui/components/label";
import { Slider } from "@reactive-resume/ui/components/slider";

const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 10, padding: 16, width: 320 };

export const Single = () => (
	<div style={field}>
		<Label>Skill level</Label>
		<Slider defaultValue={[4]} min={0} max={5} step={1} />
	</div>
);

export const Range = () => (
	<div style={field}>
		<Label>Experience (years)</Label>
		<Slider defaultValue={[2, 8]} min={0} max={15} step={1} />
	</div>
);

export const FontScale = () => (
	<div style={field}>
		<Label>Font size</Label>
		<Slider defaultValue={[62]} min={0} max={100} />
	</div>
);

export const Disabled = () => (
	<div style={field}>
		<Label style={{ opacity: 0.5 }}>Line height (locked)</Label>
		<Slider defaultValue={[50]} min={0} max={100} disabled />
	</div>
);
