import { Input } from "@reactive-resume/ui/components/input";
import { Label } from "@reactive-resume/ui/components/label";

const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, padding: 16, width: 320 };

export const Default = () => (
	<div style={field}>
		<Label htmlFor="full-name">Full name</Label>
		<Input id="full-name" defaultValue="Ada Lovelace" />
	</div>
);

export const Placeholder = () => (
	<div style={field}>
		<Label htmlFor="headline">Headline</Label>
		<Input id="headline" placeholder="e.g. Senior Software Engineer" />
	</div>
);

export const Email = () => (
	<div style={field}>
		<Label htmlFor="email">Email</Label>
		<Input id="email" type="email" defaultValue="ada@analyticalengine.dev" />
	</div>
);

export const Invalid = () => (
	<div style={field}>
		<Label htmlFor="website">Website</Label>
		<Input id="website" aria-invalid defaultValue="not-a-valid-url" />
	</div>
);

export const Disabled = () => (
	<div style={field}>
		<Label htmlFor="username">Username</Label>
		<Input id="username" disabled defaultValue="ada.lovelace" />
	</div>
);
