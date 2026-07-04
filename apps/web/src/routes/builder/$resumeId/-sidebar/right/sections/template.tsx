import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { SwapIcon } from "@phosphor-icons/react";
import { lazy, Suspense } from "react";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@reactive-resume/ui/components/hover-card";
import { templates } from "@/dialogs/resume/template/data";
import { useDialogStore } from "@/dialogs/store";
import { useCurrentResume } from "@/features/resume/builder/draft";
import { SectionBase } from "../shared/section-base";

// Lazy so the browser PDF pipeline (pdf.js) loads only when a preview card actually opens, keeping it out
// of the SSR/module graph — mirrors the `ResumePreview` entry convention.
const TemplateLivePreview = lazy(() =>
	import("@/features/resume/preview/template-live-preview").then((module) => ({
		default: module.TemplateLivePreview,
	})),
);

export function TemplateSectionBuilder() {
	return (
		<SectionBase type="template">
			<TemplateSectionForm />
		</SectionBase>
	);
}

function TemplateSectionForm() {
	const { i18n } = useLingui();
	const openDialog = useDialogStore((state) => state.openDialog);
	const resume = useCurrentResume();
	const template = resume.data.metadata.template;

	const metadata = templates[template];

	const onOpenTemplateGallery = () => {
		openDialog("resume.template.gallery", undefined);
	};

	return (
		<div className="flex @md:flex-row flex-col items-stretch gap-x-4 gap-y-2">
			<HoverCard>
				<HoverCardTrigger
					delay={300}
					render={
						<Button
							variant="ghost"
							onClick={onOpenTemplateGallery}
							className="group/preview relative h-auto w-40 shrink-0 cursor-pointer p-0"
						>
							<div className="relative z-10 aspect-page size-full overflow-hidden rounded-md opacity-100 transition-opacity group-hover/preview:opacity-50">
								<img src={metadata.imageUrl} alt={metadata.name} className="size-full object-cover" />
							</div>

							<div className="absolute inset-0 flex items-center justify-center">
								<SwapIcon size={48} weight="thin" className="size-12" />
							</div>
						</Button>
					}
				/>

				<HoverCardContent side="right" align="start" className="w-64 p-1.5">
					<Suspense
						fallback={
							<div className="aspect-page w-full overflow-hidden rounded-md bg-white">
								<img src={metadata.imageUrl} alt={metadata.name} className="size-full object-contain" />
							</div>
						}
					>
						<TemplateLivePreview
							data={resume.data}
							template={template}
							fallbackSrc={metadata.imageUrl}
							alt={t`Live preview of your resume in the ${metadata.name} template`}
						/>
					</Suspense>
				</HoverCardContent>
			</HoverCard>

			<div className="flex flex-1 flex-col gap-y-4 @md:pt-1 @md:pb-3">
				<div className="space-y-1">
					<h3 className="font-semibold text-2xl capitalize tracking-tight">{metadata.name}</h3>
					<p className="text-muted-foreground text-sm">{i18n.t(metadata.description)}</p>
				</div>

				<div className="flex flex-wrap gap-2.5">
					{metadata.tags.map((tag) => (
						<Badge key={tag} variant="secondary">
							{tag}
						</Badge>
					))}
				</div>
			</div>
		</div>
	);
}
