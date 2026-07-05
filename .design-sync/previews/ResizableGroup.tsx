import { ResizableGroup, ResizablePanel, ResizableSeparator } from "@reactive-resume/ui/components/resizable";

const panelStyle: React.CSSProperties = { height: "100%", padding: 16, fontSize: 14, lineHeight: 1.6 };
const label: React.CSSProperties = {
	fontSize: 11,
	fontWeight: 600,
	textTransform: "uppercase",
	letterSpacing: "0.05em",
	color: "var(--muted-foreground)",
	marginBottom: 8,
};

export const BuilderLayout = () => (
	<div style={{ height: 240, width: 460, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
		<ResizableGroup orientation="horizontal">
			<ResizablePanel defaultSize={40}>
				<div style={panelStyle}>
					<div style={label}>Editor</div>
					<div>Basics</div>
					<div>Work Experience</div>
					<div>Education</div>
					<div>Skills</div>
				</div>
			</ResizablePanel>
			<ResizableSeparator withHandle />
			<ResizablePanel defaultSize={60}>
				<div style={{ ...panelStyle, background: "var(--muted)" }}>
					<div style={label}>Live Preview</div>
					<div style={{ fontWeight: 600, fontSize: 16 }}>Jordan Rivera</div>
					<div style={{ color: "var(--muted-foreground)" }}>Senior Product Designer</div>
				</div>
			</ResizablePanel>
		</ResizableGroup>
	</div>
);

export const VerticalSplit = () => (
	<div style={{ height: 240, width: 300, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
		<ResizableGroup orientation="vertical">
			<ResizablePanel defaultSize={50}>
				<div style={panelStyle}>
					<div style={label}>Summary</div>
					<div>Eight years building design systems and shipping delightful product experiences.</div>
				</div>
			</ResizablePanel>
			<ResizableSeparator withHandle />
			<ResizablePanel defaultSize={50}>
				<div style={{ ...panelStyle, background: "var(--muted)" }}>
					<div style={label}>Contact</div>
					<div>jordan.rivera@email.com</div>
					<div>San Francisco, CA</div>
				</div>
			</ResizablePanel>
		</ResizableGroup>
	</div>
);
