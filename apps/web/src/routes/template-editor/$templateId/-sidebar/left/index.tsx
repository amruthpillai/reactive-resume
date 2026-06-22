import type { TemplateNodeType } from "@reactive-resume/schema/custom-template";
import { Trans } from "@lingui/react/macro";
import {
	ArrowsOutSimpleIcon,
	CardsIcon,
	CertificateIcon,
	ChatCircleDotsIcon,
	ColumnsIcon,
	GraduationCapIcon,
	HandHeartIcon,
	HeartIcon,
	IdentificationCardIcon,
	ImageIcon,
	MinusIcon,
	PhoneIcon,
	ReadCvLogoIcon,
	RowsIcon,
	ShareNetworkIcon,
	SquareIcon,
	SquaresFourIcon,
	StackIcon,
	TextAaIcon,
	TextColumnsIcon,
	TranslateIcon,
	TrophyIcon,
	UserIcon,
} from "@phosphor-icons/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@reactive-resume/ui/components/accordion";
import { ScrollArea } from "@reactive-resume/ui/components/scroll-area";

// ─── Component palette ───────────────────────────────────────────────────────

type ComponentDef = {
	type: TemplateNodeType;
	label: string;
	icon: React.ReactNode;
	description: string;
	columnCount?: 2 | 3 | 4;
};

const LAYOUT_COMPONENTS: ComponentDef[] = [
	{ type: "container", label: "Container", icon: <SquareIcon />, description: "A box that groups components" },
	{ type: "columns", label: "2 Columns", icon: <ColumnsIcon />, description: "Two-column layout", columnCount: 2 },
	{
		type: "columns",
		label: "3 Columns",
		icon: <TextColumnsIcon />,
		description: "Three-column layout",
		columnCount: 3,
	},
	{ type: "columns", label: "4 Columns", icon: <SquaresFourIcon />, description: "Four-column layout", columnCount: 4 },
	{ type: "spacer", label: "Spacer", icon: <ArrowsOutSimpleIcon />, description: "Vertical spacing" },
	{ type: "page-break", label: "Page Break", icon: <MinusIcon />, description: "Forces a new page" },
];

const HEADER_PLACEHOLDERS: ComponentDef[] = [
	{ type: "placeholder.name", label: "Full Name", icon: <UserIcon />, description: "Candidate's full name" },
	{ type: "placeholder.headline", label: "Headline", icon: <TextAaIcon />, description: "Professional headline" },
	{ type: "placeholder.picture", label: "Picture", icon: <ImageIcon />, description: "Profile photo" },
	{
		type: "placeholder.contact",
		label: "Contact Info",
		icon: <IdentificationCardIcon />,
		description: "Email, phone, location, website",
	},
];

const SECTION_PLACEHOLDERS: ComponentDef[] = [
	{ type: "placeholder.summary", label: "Summary", icon: <ReadCvLogoIcon />, description: "Professional summary" },
	{
		type: "placeholder.profiles",
		label: "Social Profiles",
		icon: <ShareNetworkIcon />,
		description: "Social profiles",
	},
	{ type: "placeholder.experience", label: "Experience", icon: <StackIcon />, description: "Work experience" },
	{ type: "placeholder.education", label: "Education", icon: <GraduationCapIcon />, description: "Education" },
	{ type: "placeholder.projects", label: "Projects", icon: <CardsIcon />, description: "Projects" },
	{ type: "placeholder.skills", label: "Skills", icon: <RowsIcon />, description: "Skills" },
	{ type: "placeholder.languages", label: "Languages", icon: <TranslateIcon />, description: "Languages" },
	{ type: "placeholder.interests", label: "Interests", icon: <HeartIcon />, description: "Interests" },
	{ type: "placeholder.awards", label: "Awards", icon: <TrophyIcon />, description: "Awards" },
	{
		type: "placeholder.certifications",
		label: "Certifications",
		icon: <CertificateIcon />,
		description: "Certifications",
	},
	{ type: "placeholder.publications", label: "Publications", icon: <ReadCvLogoIcon />, description: "Publications" },
	{ type: "placeholder.volunteer", label: "Volunteer", icon: <HandHeartIcon />, description: "Volunteer" },
	{ type: "placeholder.references", label: "References", icon: <PhoneIcon />, description: "References" },
];

// ─── Left sidebar ─────────────────────────────────────────────────────────────

export function TemplateEditorLeftSidebar() {
	const handleDragStart = (e: React.DragEvent, def: ComponentDef) => {
		const payload = JSON.stringify({ type: def.type, label: def.label, columnCount: def.columnCount });
		e.dataTransfer.setData("application/x-template-node", payload);
		if (def.type.startsWith("placeholder.")) {
			e.dataTransfer.setData("application/x-template-placeholder", "1");
		}
		e.dataTransfer.effectAllowed = "copy";
	};

	return (
		<ScrollArea className="h-[calc(100svh-3.5rem)] bg-background">
			<div className="space-y-3 p-3">
				<div className="flex items-center gap-1.5 px-1">
					<ChatCircleDotsIcon className="size-4 text-muted-foreground" />
					<p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
						<Trans>Components</Trans>
					</p>
				</div>
				<p className="px-1 text-[10px] text-muted-foreground/70 leading-relaxed">
					<Trans>Drag components onto the canvas to build your template.</Trans>
				</p>

				<Accordion multiple defaultValue={["layout", "header", "sections"]}>
					<PaletteGroup
						value="layout"
						label={<Trans>Layout</Trans>}
						items={LAYOUT_COMPONENTS}
						onDragStart={handleDragStart}
					/>
					<PaletteGroup
						value="header"
						label={<Trans>Header</Trans>}
						items={HEADER_PLACEHOLDERS}
						onDragStart={handleDragStart}
					/>
					<PaletteGroup
						value="sections"
						label={<Trans>Sections</Trans>}
						items={SECTION_PLACEHOLDERS}
						onDragStart={handleDragStart}
					/>
				</Accordion>
			</div>
		</ScrollArea>
	);
}

function PaletteGroup({
	value,
	label,
	items,
	onDragStart,
}: {
	value: string;
	label: React.ReactNode;
	items: ComponentDef[];
	onDragStart: (e: React.DragEvent, def: ComponentDef) => void;
}) {
	return (
		<AccordionItem value={value}>
			<AccordionTrigger className="font-semibold text-muted-foreground text-xs uppercase tracking-wide hover:no-underline">
				{label}
			</AccordionTrigger>
			<AccordionContent>
				<div className="grid grid-cols-1 gap-1.5 pb-1">
					{items.map((def) => (
						<ComponentChip key={`${def.type}-${def.label}`} def={def} onDragStart={onDragStart} />
					))}
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}

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
			className="flex w-full cursor-grab items-center gap-x-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm transition-colors hover:border-primary/40 hover:bg-accent active:cursor-grabbing"
			title={def.description}
		>
			<span className="text-muted-foreground">{def.icon}</span>
			<span className="truncate">{def.label}</span>
		</button>
	);
}
