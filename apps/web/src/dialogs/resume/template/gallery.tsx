import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { DialogProps } from "@/dialogs/store";
import type { TemplateMetadata } from "./data";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { SlideshowIcon } from "@phosphor-icons/react";
import { lazy, Suspense } from "react";
import { toast } from "sonner";
import { Badge } from "@reactive-resume/ui/components/badge";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@reactive-resume/ui/components/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@reactive-resume/ui/components/hover-card";
import { ScrollArea } from "@reactive-resume/ui/components/scroll-area";
import { cn } from "@reactive-resume/utils/style";
import { CometCard } from "@/components/animation/comet-card";
import { useDialogStore } from "@/dialogs/store";
import { useCurrentResume, useUpdateResumeData } from "@/features/resume/builder/draft";
import { templates } from "./data";

// Lazy so the browser PDF pipeline (pdf.js) loads only when a preview card actually opens — mirrors the
// sidebar template card. The hover card mounts its content only when open, so at most one tile renders
// live at a time; `TemplateLivePreview` caches per (data, template) and cancels on close.
const TemplateLivePreview = lazy(() =>
	import("@/features/resume/preview/template-live-preview").then((module) => ({
		default: module.TemplateLivePreview,
	})),
);

export function TemplateGalleryDialog(_: DialogProps<"resume.template.gallery">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const resume = useCurrentResume();
	const selectedTemplate = resume.data.metadata.template;
	const updateResumeData = useUpdateResumeData();

	function onSelectTemplate(template: Template) {
		// Snapshot the only field this switch mutates so the undo action fully reverts it.
		const previousTemplate = resume.data.metadata.template;
		if (template === previousTemplate) {
			closeDialog();
			return;
		}

		updateResumeData((draft) => {
			draft.metadata.template = template;
		});

		closeDialog();

		toast(t`Switched to the ${templates[template].name} template.`, {
			action: {
				label: t`Undo`,
				onClick: () => {
					updateResumeData((draft) => {
						draft.metadata.template = previousTemplate;
					});
				},
			},
		});
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

			<ScrollArea className="max-h-[80svh] pb-8">
				<div className="grid grid-cols-2 gap-6 p-4 md:grid-cols-3 lg:grid-cols-4">
					{Object.entries(templates).map(([template, metadata]) => (
						<TemplateCard
							key={template}
							data={resume.data}
							metadata={metadata}
							id={template as Template}
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
	data: ResumeData;
	isActive?: boolean;
	metadata: TemplateMetadata;
	onSelect: (template: Template) => void;
};

function TemplateCard({ id, data, metadata, isActive, onSelect }: TemplateCardProps) {
	const { i18n } = useLingui();

	return (
		<HoverCard>
			<CometCard translateDepth={3} rotateDepth={6} glareOpacity={0}>
				<HoverCardTrigger
					delay={300}
					render={
						<button
							type="button"
							onClick={() => onSelect(id)}
							className={cn(
								"relative block aspect-page size-full cursor-pointer overflow-hidden rounded-md bg-popover outline-none",
								isActive && "ring-2 ring-ring ring-offset-4 ring-offset-background",
							)}
						>
							<img src={metadata.imageUrl} alt={metadata.name} className="size-full object-cover" />
						</button>
					}
				/>

				<div className="flex items-center justify-center">
					<span className="font-bold leading-loose tracking-tight">{metadata.name}</span>
				</div>

				<HoverCardContent
					side="right"
					sideOffset={-32}
					align="start"
					alignOffset={32}
					className="pointer-events-none! flex w-80 flex-col justify-between gap-y-6 rounded-md bg-background/80 p-4 pb-6"
				>
					{/* Live peek of the user's own data through this template. Static JPG tile stays the cheap default;
					this renders on demand only while the card is open, one tile at a time. */}
					<Suspense
						fallback={
							<div className="aspect-page w-full overflow-hidden rounded-md bg-white">
								<img src={metadata.imageUrl} alt={metadata.name} className="size-full object-contain" />
							</div>
						}
					>
						<TemplateLivePreview
							data={data}
							template={id}
							fallbackSrc={metadata.imageUrl}
							alt={t`Live preview of your resume in the ${metadata.name} template`}
						/>
					</Suspense>

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
