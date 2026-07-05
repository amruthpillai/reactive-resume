import {
	AlignCenterHorizontalIcon,
	AlignLeftIcon,
	AlignRightIcon,
	ArrowClockwiseIcon,
	ArrowCounterClockwiseIcon,
	TextBIcon,
	TextItalicIcon,
	TextUnderlineIcon,
} from "@phosphor-icons/react";
import { Button } from "@reactive-resume/ui/components/button";
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "@reactive-resume/ui/components/button-group";

const wrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, padding: 16 };

export const Formatting = () => (
	<div style={wrap}>
		<ButtonGroup>
			<Button variant="outline" size="icon" aria-label="Bold">
				<TextBIcon />
			</Button>
			<Button variant="outline" size="icon" aria-label="Italic">
				<TextItalicIcon />
			</Button>
			<Button variant="outline" size="icon" aria-label="Underline">
				<TextUnderlineIcon />
			</Button>
			<ButtonGroupSeparator />
			<Button variant="outline" size="icon" aria-label="Align left">
				<AlignLeftIcon />
			</Button>
			<Button variant="outline" size="icon" aria-label="Align center">
				<AlignCenterHorizontalIcon />
			</Button>
			<Button variant="outline" size="icon" aria-label="Align right">
				<AlignRightIcon />
			</Button>
		</ButtonGroup>

		<ButtonGroup>
			<Button variant="outline">
				<ArrowCounterClockwiseIcon /> Undo
			</Button>
			<Button variant="outline">
				<ArrowClockwiseIcon /> Redo
			</Button>
		</ButtonGroup>
	</div>
);

export const WithText = () => (
	<div style={wrap}>
		<ButtonGroup>
			<ButtonGroupText>Zoom</ButtonGroupText>
			<Button variant="outline">50%</Button>
			<Button variant="outline">100%</Button>
			<Button variant="outline">150%</Button>
		</ButtonGroup>

		<ButtonGroup orientation="vertical">
			<Button variant="outline">Export PDF</Button>
			<Button variant="outline">Export DOCX</Button>
			<Button variant="outline">Copy link</Button>
		</ButtonGroup>
	</div>
);
