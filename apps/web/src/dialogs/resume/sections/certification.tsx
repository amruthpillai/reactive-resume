import type z from "zod";
import type { DialogProps } from "@/dialogs/store";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { certificationItemSchema } from "@reactive-resume/schema/resume/data";
import { FormControl, FormItem, FormLabel } from "@reactive-resume/ui/components/form";
import { Switch } from "@reactive-resume/ui/components/switch";
import { useDialogStore } from "@/dialogs/store";
import { useUpdateResumeData } from "@/features/resume/builder/draft";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { makeSectionItem } from "@/libs/resume/make-section-item";
import { createSectionItem, updateSectionItem } from "@/libs/resume/section-actions";
import { useAppForm, withForm } from "@/libs/tanstack-form";
import { SectionItemDialog } from "./section-item-dialog";

const formSchema = certificationItemSchema;

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
	id: "",
	hidden: false,
	title: "",
	issuer: "",
	date: "",
	website: { url: "", label: "", inlineLink: false },
	description: "",
};

export function CreateCertificationDialog({ data }: DialogProps<"resume.sections.certifications.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useUpdateResumeData();

	const form = useAppForm({
		defaultValues: makeSectionItem(defaultValues, data?.item),
		validators: { onSubmit: formSchema },
		onSubmit: ({ value }) => {
			updateResumeData((draft) => {
				createSectionItem(draft, "certifications", value, data?.customSectionId);
			});
			closeDialog();
		},
	});

	const { requestClose } = useFormBlocker(form);
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

	return (
		<SectionItemDialog
			title={<Trans>Create a new certification</Trans>}
			icon={<PlusIcon />}
			onSubmit={() => void form.handleSubmit()}
			onCancel={requestClose}
			isSubmitting={isSubmitting}
			submitLabel={<Trans>Create</Trans>}
		>
			<CertificationForm form={form} />
		</SectionItemDialog>
	);
}

export function UpdateCertificationDialog({ data }: DialogProps<"resume.sections.certifications.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useUpdateResumeData();

	const form = useAppForm({
		defaultValues: data.item,
		validators: { onSubmit: formSchema },
		onSubmit: ({ value }) => {
			updateResumeData((draft) => {
				updateSectionItem(draft, "certifications", value, data?.customSectionId);
			});
			closeDialog();
		},
	});

	const { requestClose } = useFormBlocker(form);
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

	return (
		<SectionItemDialog
			title={<Trans>Update an existing certification</Trans>}
			icon={<PencilSimpleLineIcon />}
			onSubmit={() => void form.handleSubmit()}
			onCancel={requestClose}
			isSubmitting={isSubmitting}
			submitLabel={<Trans>Save Changes</Trans>}
		>
			<CertificationForm form={form} />
		</SectionItemDialog>
	);
}

const CertificationForm = withForm({
	defaultValues,
	render: function CertificationFormRenderer({ form }) {
		const inlineLink = useStore(form.store, (s) => s.values.website.inlineLink);

		return (
			<>
				<form.AppField name="title">{(field) => <field.TextField label={<Trans>Title</Trans>} />}</form.AppField>

				<form.AppField name="issuer">{(field) => <field.TextField label={<Trans>Issuer</Trans>} />}</form.AppField>

				<form.AppField name="date">{(field) => <field.TextField label={<Trans>Date</Trans>} />}</form.AppField>

				<form.AppField name="website">
					{(field) => <field.WebsiteField label={<Trans>Website</Trans>} hideLabelButton={inlineLink} />}
				</form.AppField>

				<form.Field name="website.inlineLink">
					{(field) => (
						<FormItem className="flex items-center gap-x-2">
							<FormControl
								render={
									<Switch
										checked={field.state.value}
										onCheckedChange={(checked: boolean) => {
											field.handleChange(checked);
										}}
									/>
								}
							/>
							<FormLabel className="mt-0!">
								<Trans>Show link in title</Trans>
							</FormLabel>
						</FormItem>
					)}
				</form.Field>

				<form.AppField name="description">
					{(field) => <field.RichTextField label={<Trans>Description</Trans>} formItemClassName="sm:col-span-full" />}
				</form.AppField>
			</>
		);
	},
});
