import type { CustomTemplateData } from "@reactive-resume/schema/custom-template";
import type { Template } from "@reactive-resume/schema/templates";
import type { DialogProps } from "@/dialogs/store";
import type { TemplateMetadata } from "./data";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, SlideshowIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@reactive-resume/ui/components/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@reactive-resume/ui/components/hover-card";
import { ScrollArea } from "@reactive-resume/ui/components/scroll-area";
import { Separator } from "@reactive-resume/ui/components/separator";
import { cn } from "@reactive-resume/utils/style";
import { CometCard } from "@/components/animation/comet-card";
import { useDialogStore } from "@/dialogs/store";
import { useCurrentResume, useUpdateResumeData } from "@/features/resume/builder/draft";
import { orpc } from "@/libs/orpc/client";
import { templates } from "./data";

export function TemplateGalleryDialog(_: DialogProps<"resume.template.gallery">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const resume = useCurrentResume();
	const selectedTemplate = resume.data.metadata.template;
	const selectedCustomTemplateId = resume.data.metadata.customTemplateId;
	const updateResumeData = useUpdateResumeData();

	const { data: customTemplates = [] } = useQuery(orpc.customTemplate.list.queryOptions());

	function onSelectBuiltinTemplate(template: Template) {
		updateResumeData((draft) => {
			draft.metadata.template = template;
			const meta = draft.metadata as { customTemplateId?: string; customTemplate?: unknown };
			delete meta.customTemplateId;
			delete meta.customTemplate;
		});
		closeDialog();
	}

	function onSelectCustomTemplate(id: string, data: CustomTemplateData) {
		updateResumeData((draft) => {
			// `template` keeps the base for font/color defaults; the custom
			// template drives layout & styling via its inlined snapshot.
			draft.metadata.template = data.baseTemplate;
			draft.metadata.customTemplateId = id;
			(draft.metadata as { customTemplate?: CustomTemplateData }).customTemplate = structuredClone(data);
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
					<Trans>Choose from community-designed templates or pick one of your own custom templates.</Trans>
				</DialogDescription>
			</DialogHeader>

			<ScrollArea className="max-h-[80svh] pb-8">
				<div className="space-y-8 p-4">
					{/* ── My Templates ── */}
					{customTemplates.length > 0 && (
						<section className="space-y-3">
							<div className="flex items-center justify-between">
								<h3 className="font-semibold text-sm">
									<Trans>My Templates</Trans>
								</h3>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 gap-1.5 px-2 text-xs"
									nativeButton={false}
									render={
										<Link to="/dashboard/templates">
											<PencilSimpleLineIcon className="size-3.5" />
											<Trans>Manage</Trans>
										</Link>
									}
								/>
							</div>

							<div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
								{customTemplates.map((ct) => (
									<CustomTemplateCard
										key={ct.id}
										id={ct.id}
										name={ct.name}
										data={ct.data}
										isActive={ct.id === selectedCustomTemplateId}
										onSelect={onSelectCustomTemplate}
									/>
								))}
							</div>

							<Separator />
						</section>
					)}

					{/* ── Community Templates ── */}
					<section className="space-y-3">
						<h3 className="font-semibold text-sm">
							<Trans>Community Templates</Trans>
						</h3>

						<div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
							{Object.entries(templates).map(([template, metadata]) => (
								<BuiltinTemplateCard
									key={template}
									metadata={metadata}
									id={template as Template}
									isActive={template === selectedTemplate && !selectedCustomTemplateId}
									onSelect={onSelectBuiltinTemplate}
								/>
							))}
						</div>
					</section>
				</div>
			</ScrollArea>
		</DialogContent>
	);
}

// ─── Built-in template card ───────────────────────────────────────────────────

type BuiltinTemplateCardProps = {
	id: Template;
	isActive?: boolean;
	metadata: TemplateMetadata;
	onSelect: (template: Template) => void;
};

function BuiltinTemplateCard({ id, metadata, isActive, onSelect }: BuiltinTemplateCardProps) {
	const { i18n } = useLingui();

	return (
		<HoverCard>
			<CometCard translateDepth={3} rotateDepth={6} glareOpacity={0}>
				<HoverCardTrigger
					render={
						<button
							type="button"
							tabIndex={-1}
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

// ─── Custom template card ─────────────────────────────────────────────────────

type CustomTemplateCardProps = {
	id: string;
	name: string;
	data: CustomTemplateData;
	isActive?: boolean;
	onSelect: (id: string, data: CustomTemplateData) => void;
};

function CustomTemplateCard({ id, name, data, isActive, onSelect }: CustomTemplateCardProps) {
	const baseMetadata = templates[data.baseTemplate];

	return (
		<HoverCard>
			<CometCard translateDepth={3} rotateDepth={6} glareOpacity={0}>
				<HoverCardTrigger
					render={
						<button
							type="button"
							tabIndex={-1}
							onClick={() => onSelect(id, data)}
							className={cn(
								"relative block aspect-page size-full cursor-pointer overflow-hidden rounded-md bg-popover outline-none",
								isActive && "ring-2 ring-ring ring-offset-4 ring-offset-background",
							)}
						>
							<img src={baseMetadata.imageUrl} alt={name} className="size-full object-cover brightness-90" />

							{/* Name label pinned to bottom */}
							<div className="absolute inset-x-0 bottom-0 bg-background/75 px-2 py-1.5 backdrop-blur-sm">
								<p className="truncate font-medium text-[11px]">{name}</p>
							</div>

							{/* "Custom" badge pinned to top-right */}
							<div className="absolute top-1.5 right-1.5">
								<span className="rounded bg-primary px-1.5 py-0.5 font-semibold text-[10px] text-primary-foreground">
									Custom
								</span>
							</div>
						</button>
					}
				/>

				<div className="flex items-center justify-center">
					<span className="font-bold leading-loose tracking-tight">{name}</span>
				</div>

				<HoverCardContent
					side="right"
					sideOffset={-32}
					align="start"
					alignOffset={32}
					className="pointer-events-none! flex w-80 flex-col justify-between gap-y-4 rounded-md bg-background/80 p-4 pb-6"
				>
					<div className="space-y-1.5">
						<div className="flex items-center gap-2">
							<h3 className="font-semibold text-lg">{name}</h3>
							<Badge variant="secondary" className="text-[10px]">
								<Trans>Custom</Trans>
							</Badge>
						</div>
						<p className="text-muted-foreground text-sm">
							<Trans>Based on {baseMetadata.name}</Trans>
						</p>
					</div>
				</HoverCardContent>
			</CometCard>
		</HoverCard>
	);
}
