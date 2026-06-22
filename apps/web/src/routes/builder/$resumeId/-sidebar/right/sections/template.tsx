import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { SwapIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { templates } from "@/dialogs/resume/template/data";
import { useDialogStore } from "@/dialogs/store";
import { useCurrentResume } from "@/features/resume/builder/draft";
import { orpc } from "@/libs/orpc/client";
import { SectionBase } from "../shared/section-base";

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
	const baseTemplate = resume.data.metadata.template;
	const customTemplateId = resume.data.metadata.customTemplateId;

	// Only fetch the list when a custom template is active; the list is already
	// cached if the user just came from the gallery, so this is a cache-hit.
	const { data: customTemplates } = useQuery({
		...orpc.customTemplate.list.queryOptions(),
		enabled: !!customTemplateId,
	});

	const activeCustomTemplate = customTemplateId ? customTemplates?.find((ct) => ct.id === customTemplateId) : undefined;

	const baseMetadata = templates[baseTemplate];

	const onOpenTemplateGallery = () => {
		openDialog("resume.template.gallery", undefined);
	};

	const displayName = activeCustomTemplate?.name ?? baseMetadata.name;
	const displayDescription = activeCustomTemplate ? `Based on ${baseMetadata.name}` : i18n.t(baseMetadata.description);

	return (
		<div className="flex @md:flex-row flex-col items-stretch gap-x-4 gap-y-2">
			<Button
				variant="ghost"
				onClick={onOpenTemplateGallery}
				className="group/preview relative h-auto w-40 shrink-0 cursor-pointer p-0"
			>
				<div className="relative z-10 aspect-page size-full overflow-hidden rounded-md opacity-100 transition-opacity group-hover/preview:opacity-50">
					<img src={baseMetadata.imageUrl} alt={displayName} className="size-full object-cover" />

					{/* Overlay badge so user knows a custom template is active */}
					{activeCustomTemplate && (
						<div className="absolute inset-x-0 bottom-0 bg-background/75 px-2 py-1 backdrop-blur-sm">
							<p className="truncate font-medium text-[10px]">{activeCustomTemplate.name}</p>
						</div>
					)}
				</div>

				<div className="absolute inset-0 flex items-center justify-center">
					<SwapIcon size={48} weight="thin" className="size-12" />
				</div>
			</Button>

			<div className="flex flex-1 flex-col gap-y-4 @md:pt-1 @md:pb-3">
				<div className="space-y-1">
					<div className="flex flex-wrap items-center gap-2">
						<h3 className="font-semibold text-2xl capitalize tracking-tight">{displayName}</h3>
						{activeCustomTemplate && (
							<Badge variant="secondary" className="text-[10px]">
								<Trans>Custom</Trans>
							</Badge>
						)}
					</div>
					<p className="text-muted-foreground text-sm">{displayDescription}</p>
				</div>

				<div className="flex flex-wrap gap-2.5">
					{!activeCustomTemplate &&
						baseMetadata.tags.map((tag) => (
							<Badge key={tag} variant="secondary">
								{tag}
							</Badge>
						))}
				</div>
			</div>
		</div>
	);
}
