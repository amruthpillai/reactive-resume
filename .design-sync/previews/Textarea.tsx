import { Label } from "@reactive-resume/ui/components/label";
import { Textarea } from "@reactive-resume/ui/components/textarea";

const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, padding: 16, width: 360 };

export const Default = () => (
	<div style={field}>
		<Label htmlFor="summary">Summary</Label>
		<Textarea id="summary" placeholder="Write a short professional summary…" rows={4} />
	</div>
);

export const Filled = () => (
	<div style={field}>
		<Label htmlFor="about">About</Label>
		<Textarea
			id="about"
			rows={4}
			defaultValue="Mathematician and writer, known for early work on Charles Babbage's Analytical Engine and the first published algorithm intended for a machine."
		/>
	</div>
);

export const Invalid = () => (
	<div style={field}>
		<Label htmlFor="bio">Biography</Label>
		<Textarea id="bio" aria-invalid rows={3} defaultValue="Too short." />
	</div>
);

export const Disabled = () => (
	<div style={field}>
		<Label htmlFor="notes">Internal notes</Label>
		<Textarea id="notes" disabled rows={3} defaultValue="Notes are locked while this resume is published." />
	</div>
);
