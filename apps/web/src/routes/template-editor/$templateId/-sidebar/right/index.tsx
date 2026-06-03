import type { TemplateNodeType } from "@reactive-resume/schema/custom-template";
import { Trans } from "@lingui/react/macro";
import {
	ArrowsOutSimpleIcon,
	BracketsCurlyIcon,
	CornersOutIcon,
	IdentificationCardIcon,
	ImageIcon,
	MinusIcon,
	RowsIcon,
	SquareIcon,
	SquareSplitHorizontalIcon,
	UserIcon,
} from "@phosphor-icons/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@reactive-resume/ui/components/accordion";
import { ScrollArea } from "@reactive-resume/ui/components/scroll-area";
import { Separator } from "@reactive-resume/ui/components/separator";
import { useSelectedNode } from "@/features/template-editor/store";
import { NodePropertiesPanel } from "./node-properties";

type ComponentDef = {
	type: TemplateNodeType;
	label: string;
	icon: React.ReactNode;
	description: string;
};

const layoutComponents: ComponentDef[] = [
	{
		type: "container",
		label: "Container",
		icon: <SquareIcon />,
		description: "A simple box that can hold other components",
	},
	{
		type: "columns",
		label: "2 Columns",
		icon: <SquareSplitHorizontalIcon />,
		description: "Two-column layout",
	},
	{
		type: "columns",
		label: "3 Columns",
		icon: <RowsIcon className="rotate-90" />,
		description: "Three-column layout",
	},
	{
		type: "columns",
		label: "4 Columns",
		icon: <CornersOutIcon />,
		description: "Four-column layout",
	},
	{
		type: "spacer",
		label: "Spacer",
		icon: <ArrowsOutSimpleIcon />,
		description: "Vertical spacing element",
	},
	{
		type: "page-break",
		label: "Page Break",
		icon: <MinusIcon />,
		description: "Forces a new page",
	},
];

const placeholderComponents: ComponentDef[] = [
	{ type: "placeholder.name", label: "Full Name", icon: <UserIcon />, description: "Candidate's full name" },
	{
		type: "placeholder.headline",
		label: "Headline",
		icon: <BracketsCurlyIcon />,
		description: "Professional headline",
	},
	{ type: "placeholder.picture", label: "Picture", icon: <ImageIcon />, description: "Profile photo" },
	{
		type: "placeholder.contact",
		label: "Contact Info",
		icon: <IdentificationCardIcon />,
		description: "Email, phone, location, website",
	},
	{ type: "placeholder.summary", label: "Summary", icon: <BracketsCurlyIcon />, description: "Professional summary" },
	{
		type: "placeholder.experience",
		label: "Experience",
		icon: <BracketsCurlyIcon />,
		description: "Work experience section",
	},
	{
		type: "placeholder.education",
		label: "Education",
		icon: <BracketsCurlyIcon />,
		description: "Education section",
	},
	{ type: "placeholder.projects", label: "Projects", icon: <BracketsCurlyIcon />, description: "Projects section" },
	{ type: "placeholder.skills", label: "Skills", icon: <BracketsCurlyIcon />, description: "Skills section" },
	{
		type: "placeholder.languages",
		label: "Languages",
		icon: <BracketsCurlyIcon />,
		description: "Languages section",
	},
	{
		type: "placeholder.interests",
		label: "Interests",
		icon: <BracketsCurlyIcon />,
		description: "Interests section",
	},
	{ type: "placeholder.awards", label: "Awards", icon: <BracketsCurlyIcon />, description: "Awards section" },
	{
		type: "placeholder.certifications",
		label: "Certifications",
		icon: <BracketsCurlyIcon />,
		description: "Certifications section",
	},
	{
		type: "placeholder.publications",
		label: "Publications",
		icon: <BracketsCurlyIcon />,
		description: "Publications section",
	},
	{
		type: "placeholder.volunteer",
		label: "Volunteer",
		icon: <BracketsCurlyIcon />,
		description: "Volunteer section",
	},
	{
		type: "placeholder.references",
		label: "References",
		icon: <BracketsCurlyIcon />,
		description: "References section",
	},
	{
		type: "placeholder.profiles",
		label: "Social Profiles",
		icon: <BracketsCurlyIcon />,
		description: "Social profiles section",
	},
];

const getColumnCount = (label: string): 2 | 3 | 4 => {
	if (label.startsWith("2")) return 2;
	if (label.startsWith("3")) return 3;
	return 4;
};

function ComponentChip({
	def,
	onDragStart,
}: {
	def: ComponentDef;
	onDragStart: (e: React.DragEvent, def: ComponentDef) => void;
}) {
	return (
		<button
			type="button"
			draggable
			onDragStart={(e) => onDragStart(e, def)}
			className="flex w-full cursor-grab items-center gap-x-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent active:cursor-grabbing"
			title={def.description}
		>
			<span className="text-muted-foreground">{def.icon}</span>
			<span className="truncate">{def.label}</span>
		</button>
	);
}

export function TemplateEditorRightSidebar() {
	const selectedNode = useSelectedNode();

	const handleDragStart = (e: React.DragEvent, def: ComponentDef) => {
		const payload = JSON.stringify({
			type: def.type,
			label: def.label,
			columnCount: def.type === "columns" ? getColumnCount(def.label) : undefined,
		});
		e.dataTransfer.setData("application/x-template-node", payload);
		e.dataTransfer.effectAllowed = "copy";
	};

	return (
		<ScrollArea className="h-[calc(100svh-3.5rem)] bg-background">
			<div className="space-y-2 p-3">
				{selectedNode ? (
					<>
						<p className="px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
							<Trans>Properties</Trans>
						</p>
						<NodePropertiesPanel node={selectedNode} />
						<Separator className="my-2" />
					</>
				) : null}

				<Accordion multiple defaultValue={["layout", "placeholders"]}>
					<AccordionItem value="layout">
						<AccordionTrigger className="font-semibold text-muted-foreground text-xs uppercase tracking-wide hover:no-underline">
							<Trans>Layout</Trans>
						</AccordionTrigger>
						<AccordionContent>
							<div className="grid grid-cols-1 gap-1.5 pb-1">
								{layoutComponents.map((def) => (
									<ComponentChip key={`${def.type}-${def.label}`} def={def} onDragStart={handleDragStart} />
								))}
							</div>
						</AccordionContent>
					</AccordionItem>

					<AccordionItem value="placeholders">
						<AccordionTrigger className="font-semibold text-muted-foreground text-xs uppercase tracking-wide hover:no-underline">
							<Trans>Placeholders</Trans>
						</AccordionTrigger>
						<AccordionContent>
							<div className="grid grid-cols-1 gap-1.5 pb-1">
								{placeholderComponents.map((def) => (
									<ComponentChip key={def.type} def={def} onDragStart={handleDragStart} />
								))}
							</div>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</ScrollArea>
	);
}
