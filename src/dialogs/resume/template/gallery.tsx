import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { SlideshowIcon } from "@phosphor-icons/react";
import { type RefObject, useRef } from "react";
import { CometCard } from "@/components/animation/comet-card";
import { useResumeStore } from "@/components/resume/store/resume";
import { Badge } from "@/components/ui/badge";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type DialogProps, useDialogStore } from "@/dialogs/store";
import type { Template } from "@/schema/templates";
import { cn } from "@/utils/style";
import { type TemplateMetadata, templates } from "./data";

export function TemplateGalleryDialog(_: DialogProps<"resume.template.gallery">) {
	const scrollAreaRef = useRef<HTMLDivElement | null>(null);

	const closeDialog = useDialogStore((state) => state.closeDialog);
	const selectedTemplate = useResumeStore((state) => state.resume.data.metadata.template);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	function onSelectTemplate(template: Template) {
		updateResumeData((draft) => {
			draft.metadata.template = template;
		});

		closeDialog();
	}

	return (
		<DialogContent className="lg:max-w-5xl">
			<DialogHeader className="gap-2">
				<DialogTitle className="flex items-center gap-3 text-xl">
					<SlideshowIcon size={20} />
					<Trans>Template Gallery</Trans>
				</DialogTitle>
				<DialogDescription className="leading-relaxed">
					<Trans>
						Here's a range of resume templates for different professions and personalities. Whether you prefer modern or
						classic, bold or simple, there is a design to match you. Look through the options below and choose a
						template that fits your style.
					</Trans>
				</DialogDescription>
			</DialogHeader>

			<ScrollArea ref={scrollAreaRef} className="max-h-[80svh] pb-8">
				<div className="grid grid-cols-2 gap-6 p-4 md:grid-cols-3 lg:grid-cols-4">
					{Object.entries(templates).map(([template, metadata]) => (
						<TemplateCard
							key={template}
							metadata={metadata}
							id={template as Template}
							collisionBoundary={scrollAreaRef}
							isActive={template === selectedTemplate}
							onSelect={onSelectTemplate}
						/>
					))}
				</div>
			</ScrollArea>
		</DialogContent>
	);
}

type TemplateCardProps = {
	id: Template;
	isActive?: boolean;
	metadata: TemplateMetadata;
	collisionBoundary: RefObject<HTMLDivElement | null>;
	onSelect: (template: Template) => void;
};

function TemplateCard({ id, metadata, isActive, collisionBoundary, onSelect }: TemplateCardProps) {
	const { i18n } = useLingui();

	return (
		<HoverCard openDelay={0} closeDelay={0}>
			<CometCard translateDepth={3} rotateDepth={6} glareOpacity={0}>
				<HoverCardTrigger asChild>
					<button
						tabIndex={-1}
						onClick={() => onSelect(id)}
						className={cn(
							"relative block aspect-page size-full cursor-pointer overflow-hidden rounded-md bg-popover outline-none",
							isActive && "ring-2 ring-ring ring-offset-4 ring-offset-background",
						)}
					>
						<img src={metadata.imageUrl} alt={metadata.name} className="size-full object-cover" />
					</button>
				</HoverCardTrigger>

				<div className="flex items-center justify-center">
					<span className="font-bold leading-loose tracking-tight">{metadata.name}</span>
				</div>

				<HoverCardContent
					side="right"
					sideOffset={-32}
					align="start"
					alignOffset={32}
					collisionBoundary={collisionBoundary.current}
					className="pointer-events-none! flex w-80 flex-col justify-between space-y-6 rounded-md bg-background/80 p-4 pb-6"
				>
					<div className="space-y-1">
						<h3 className="font-semibold text-lg">{metadata.name}</h3>
						<p className="text-muted-foreground">{i18n.t(metadata.description)}</p>
					</div>

					{metadata.tags.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{metadata.tags
								.sort((a, b) => a.localeCompare(b))
								.map((tag) => (
									<Badge key={tag} variant="default">
										{tag}
									</Badge>
								))}
						</div>
					)}
				</HoverCardContent>
			</CometCard>
		</HoverCard>
	);
}
