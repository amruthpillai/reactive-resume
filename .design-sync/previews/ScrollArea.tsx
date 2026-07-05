import { ScrollArea } from "@reactive-resume/ui/components/scroll-area";

const templates = [
	{ name: "Azurill", tag: "Minimal" },
	{ name: "Bronzor", tag: "Classic" },
	{ name: "Chikorita", tag: "Modern" },
	{ name: "Ditto", tag: "Compact" },
	{ name: "Gengar", tag: "Bold" },
	{ name: "Glalie", tag: "Elegant" },
	{ name: "Kakuna", tag: "Timeless" },
	{ name: "Leafish", tag: "Creative" },
	{ name: "Nosepass", tag: "Formal" },
	{ name: "Onyx", tag: "Technical" },
	{ name: "Pikachu", tag: "Friendly" },
	{ name: "Rhyhorn", tag: "Corporate" },
];

const rowStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	padding: "10px 14px",
	borderBottom: "1px solid var(--border)",
	fontSize: 14,
};

export const TemplateList = () => (
	<ScrollArea style={{ height: 240, width: 320, border: "1px solid var(--border)", borderRadius: 8 }}>
		<div style={{ padding: 4 }}>
			{templates.map((template) => (
				<div key={template.name} style={rowStyle}>
					<span style={{ fontWeight: 500 }}>{template.name}</span>
					<span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{template.tag}</span>
				</div>
			))}
		</div>
	</ScrollArea>
);
