import {
	TextAlignCenterIcon,
	TextAlignLeftIcon,
	TextAlignRightIcon,
	TextBolderIcon,
	TextItalicIcon,
	TextUnderlineIcon,
} from "@phosphor-icons/react";
import { Toggle } from "@reactive-resume/ui/components/toggle";

const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: 16 };
const group: React.CSSProperties = { display: "flex", alignItems: "center", gap: 2, padding: 16 };

export const States = () => (
	<div style={row}>
		<Toggle aria-label="Bold" defaultPressed>
			<TextBolderIcon />
		</Toggle>
		<Toggle aria-label="Italic">
			<TextItalicIcon />
		</Toggle>
		<Toggle aria-label="Underline" disabled>
			<TextUnderlineIcon />
		</Toggle>
	</div>
);

export const Outline = () => (
	<div style={row}>
		<Toggle variant="outline" defaultPressed>
			<TextBolderIcon /> Bold
		</Toggle>
		<Toggle variant="outline">
			<TextItalicIcon /> Italic
		</Toggle>
	</div>
);

export const Sizes = () => (
	<div style={row}>
		<Toggle size="sm" aria-label="Bold small">
			<TextBolderIcon />
		</Toggle>
		<Toggle size="default" aria-label="Bold default" defaultPressed>
			<TextBolderIcon />
		</Toggle>
		<Toggle size="lg" aria-label="Bold large">
			<TextBolderIcon />
		</Toggle>
	</div>
);

export const AlignmentGroup = () => (
	<div style={group}>
		<Toggle variant="outline" aria-label="Align left" defaultPressed>
			<TextAlignLeftIcon />
		</Toggle>
		<Toggle variant="outline" aria-label="Align center">
			<TextAlignCenterIcon />
		</Toggle>
		<Toggle variant="outline" aria-label="Align right">
			<TextAlignRightIcon />
		</Toggle>
	</div>
);
