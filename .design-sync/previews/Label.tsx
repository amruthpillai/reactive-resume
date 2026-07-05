import { Input } from "@reactive-resume/ui/components/input";
import { Label } from "@reactive-resume/ui/components/label";
import { Switch } from "@reactive-resume/ui/components/switch";

const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, padding: 16, width: 320 };
const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: 16, width: 320 };

export const WithInput = () => (
	<div style={field}>
		<Label htmlFor="company">Company</Label>
		<Input id="company" defaultValue="Analytical Engine Co." />
	</div>
);

export const Required = () => (
	<div style={field}>
		<Label htmlFor="job-title">
			Job title <span style={{ color: "var(--destructive)" }}>*</span>
		</Label>
		<Input id="job-title" placeholder="e.g. Lead Engineer" />
	</div>
);

export const WithSwitch = () => (
	<div style={row}>
		<Switch id="public-resume" defaultChecked />
		<Label htmlFor="public-resume">Public resume</Label>
	</div>
);

export const Disabled = () => (
	<div style={field}>
		<Label htmlFor="locked-field" data-disabled="true" style={{ opacity: 0.5 }}>
			Locked field
		</Label>
		<Input id="locked-field" disabled defaultValue="Read only" />
	</div>
);
