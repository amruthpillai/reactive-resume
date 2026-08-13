import type z from "zod";
import type { DialogProps } from "@/dialogs/store";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { languageItemSchema } from "@reactive-resume/schema/resume/data";
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Slider } from "@reactive-resume/ui/components/slider";
import { useDialogStore } from "@/dialogs/store";
import { useUpdateResumeData } from "@/features/resume/builder/draft";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { makeSectionItem } from "@/libs/resume/make-section-item";
import { createSectionItem, updateSectionItem } from "@/libs/resume/section-actions";
import { useAppForm, withForm } from "@/libs/tanstack-form";
import { SectionItemDialog } from "./section-item-dialog";

const formSchema = languageItemSchema;

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
	id: "",
	hidden: false,
	language: "",
	fluency: "",
	level: 0,
};

export function CreateLanguageDialog({ data }: DialogProps<"resume.sections.languages.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useUpdateResumeData();

	const form = useAppForm({
		defaultValues: makeSectionItem(defaultValues, data?.item),
		validators: { onSubmit: formSchema },
		onSubmit: ({ value }) => {
			updateResumeData((draft) => {
				createSectionItem(draft, "languages", value, data?.customSectionId);
			});
			closeDialog();
		},
	});

	const { requestClose } = useFormBlocker(form);
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

	return (
		<SectionItemDialog
			title={<Trans>Create a new language</Trans>}
			icon={<PlusIcon />}
			onSubmit={() => void form.handleSubmit()}
			onCancel={requestClose}
			isSubmitting={isSubmitting}
			submitLabel={<Trans>Create</Trans>}
		>
			<LanguageForm form={form} />
		</SectionItemDialog>
	);
}

export function UpdateLanguageDialog({ data }: DialogProps<"resume.sections.languages.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useUpdateResumeData();

	const form = useAppForm({
		defaultValues: data.item,
		validators: { onSubmit: formSchema },
		onSubmit: ({ value }) => {
			updateResumeData((draft) => {
				updateSectionItem(draft, "languages", value, data?.customSectionId);
			});
			closeDialog();
		},
	});

	const { requestClose } = useFormBlocker(form);
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

	return (
		<SectionItemDialog
			title={<Trans>Update an existing language</Trans>}
			icon={<PencilSimpleLineIcon />}
			onSubmit={() => void form.handleSubmit()}
			onCancel={requestClose}
			isSubmitting={isSubmitting}
			submitLabel={<Trans>Save Changes</Trans>}
		>
			<LanguageForm form={form} />
		</SectionItemDialog>
	);
}

const LanguageForm = withForm({
	defaultValues,
	render: ({ form }) => {
		return (
			<>
				<form.AppField name="language">{(field) => <field.TextField label={<Trans>Language</Trans>} />}</form.AppField>

				<form.AppField name="fluency">{(field) => <field.TextField label={<Trans>Fluency</Trans>} />}</form.AppField>

				<form.Field name="level">
					{(field) => (
						<FormItem
							className="gap-4 sm:col-span-full"
							hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
						>
							<FormLabel>
								<Trans>Level</Trans>
							</FormLabel>
							<FormControl
								render={
									<Slider
										min={0}
										max={5}
										step={1}
										value={[field.state.value]}
										onValueChange={(value) => {
											field.handleChange(Array.isArray(value) ? value[0] : value);
										}}
									/>
								}
							/>
							<FormMessage errors={field.state.meta.errors} />
							<FormDescription>
								{Number(field.state.value) === 0 ? t`Hidden` : `${field.state.value} / 5`}
							</FormDescription>
						</FormItem>
					)}
				</form.Field>
			</>
		);
	},
});
