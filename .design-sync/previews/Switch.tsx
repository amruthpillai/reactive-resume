import { Label } from "@reactive-resume/ui/components/label";
import { Switch } from "@reactive-resume/ui/components/switch";

const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: 16, width: 300 };
const stack: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, padding: 16, width: 300 };

export const On = () => (
	<div style={row}>
		<Switch id="sw-public" defaultChecked />
		<Label htmlFor="sw-public">Public resume</Label>
	</div>
);

export const Off = () => (
	<div style={row}>
		<Switch id="sw-template" />
		<Label htmlFor="sw-template">Show icons in template</Label>
	</div>
);

export const Small = () => (
	<div style={row}>
		<Switch id="sw-page-numbers" size="sm" defaultChecked />
		<Label htmlFor="sw-page-numbers">Show page numbers</Label>
	</div>
);

export const Disabled = () => (
	<div style={stack}>
		<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
			<Switch id="sw-ai" disabled defaultChecked />
			<Label htmlFor="sw-ai">AI suggestions</Label>
		</div>
		<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
			<Switch id="sw-index" disabled />
			<Label htmlFor="sw-index">Index on search engines</Label>
		</div>
	</div>
);
