import { LockIcon, SlideshowIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { type RefObject, useRef } from "react";
import { CometCard } from "@/components/animation/comet-card";
import { useResumeStore } from "@/components/resume/store/resume";
import { Badge } from "@/components/ui/badge";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type DialogProps, useDialogStore } from "@/dialogs/store";
import { orpc } from "@/integrations/orpc/client";
import type { Template } from "@/schema/templates";
import { cn } from "@/utils/style";
import { type TemplateMetadata, templates } from "./data";

export function TemplateGalleryDialog(_: DialogProps<"resume.template.gallery">) {
	const scrollAreaRef = useRef<HTMLDivElement | null>(null);

	const closeDialog = useDialogStore((state) => state.closeDialog);
	const selectedTemplate = useResumeStore((state) => state.resume.data.metadata.template);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const { data: billingStatus } = useQuery(orpc.billing.getStatus.queryOptions());
	const userPlan = billingStatus?.plan ?? "free";

	function onSelectTemplate(template: Template) {
		const metadata = templates[template];

		// Block premium templates for free users
		if (metadata.tier === "pro" && userPlan === "free") {
			return;
		}

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
					Template Gallery
				</DialogTitle>
				<DialogDescription className="leading-relaxed">
					Here's a range of resume templates for different professions and personalities. Whether you prefer modern or
						classic, bold or simple, there is a design to match you. Look through the options below and choose a
						template that fits your style.
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
							isLocked={metadata.tier === "pro" && userPlan === "free"}
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
	isLocked?: boolean;
	metadata: TemplateMetadata;
	collisionBoundary: RefObject<HTMLDivElement | null>;
	onSelect: (template: Template) => void;
};

function TemplateCard({ id, metadata, isActive, isLocked, collisionBoundary, onSelect }: TemplateCardProps) {
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
							isLocked && "cursor-not-allowed opacity-60",
						)}
					>
						<img src={metadata.imageUrl} alt={metadata.name} className="size-full object-cover" />

						{isLocked && (
							<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70">
								<LockIcon size={24} weight="fill" className="text-muted-foreground" />
								<span className="font-medium text-muted-foreground text-xs">Pro</span>
							</div>
						)}
					</button>
				</HoverCardTrigger>

				<div className="flex items-center justify-center gap-1.5">
					<span className="font-bold leading-loose tracking-tight">{metadata.name}</span>
					{metadata.tier === "pro" && (
						<Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
							Pro
						</Badge>
					)}
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
						<p className="text-muted-foreground">{metadata.description}</p>
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
