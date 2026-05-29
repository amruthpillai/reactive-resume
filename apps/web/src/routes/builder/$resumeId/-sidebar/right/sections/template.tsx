import type { Template } from "@reactive-resume/schema/templates";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { SwapIcon } from "@phosphor-icons/react";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { Combobox } from "@/components/ui/combobox";
import { getTemplateDescription, templates } from "@/dialogs/resume/template/data";
import { useDialogStore } from "@/dialogs/store";
import { useCurrentResume, useUpdateResumeData } from "@/features/resume/builder/draft";
import { SectionBase } from "../shared/section-base";

const templateOptions = Object.entries(templates).map(([template, metadata]) => ({
	value: template as Template,
	label: metadata.name,
	keywords: [template, metadata.name, ...metadata.tags],
}));

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
	const updateResumeData = useUpdateResumeData();
	const template = resume.data.metadata.template;

	const metadata = templates[template];

	const onOpenTemplateGallery = () => {
		openDialog("resume.template.gallery", undefined);
	};

	const onSelectTemplate = (template: Template | null) => {
		if (!template) return;

		updateResumeData((draft) => {
			const metadata = templates[template];
			draft.metadata.template = template;
			draft.metadata.design.colors.primary = metadata.accentColor;
		});
	};

	return (
		<div className="flex @md:flex-row flex-col items-stretch gap-x-4 gap-y-2">
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

			<div className="flex flex-1 flex-col gap-y-4 @md:pt-1 @md:pb-3">
				<div className="space-y-1">
					<h3 className="font-semibold text-2xl capitalize tracking-tight">{metadata.name}</h3>
					<p className="text-muted-foreground text-sm">
						{getTemplateDescription(metadata.description, (descriptor) => i18n.t(descriptor))}
					</p>
				</div>

				<div className="flex flex-wrap gap-2.5">
					{metadata.tags.map((tag) => (
						<Badge key={tag} variant="secondary">
							{tag}
						</Badge>
					))}
				</div>

				<div className="space-y-2">
					<Combobox
						options={templateOptions}
						value={template}
						onValueChange={onSelectTemplate}
						placeholder={t`Choose a template`}
						searchPlaceholder={t`Search templates...`}
						emptyMessage={t`No templates found.`}
						className="w-full"
					/>

					<Button type="button" variant="outline" className="w-full justify-start" onClick={onOpenTemplateGallery}>
						<SwapIcon />
						<Trans>Browse templates</Trans>
					</Button>
				</div>
			</div>
		</div>
	);
}
