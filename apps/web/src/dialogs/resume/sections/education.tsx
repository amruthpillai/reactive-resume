import type z from "zod";
import type { DialogProps } from "@/dialogs/store";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { educationItemSchema } from "@reactive-resume/schema/resume/data";
import { FormControl, FormItem, FormLabel } from "@reactive-resume/ui/components/form";
import { Switch } from "@reactive-resume/ui/components/switch";
import { useDialogStore } from "@/dialogs/store";
import { useUpdateResumeData } from "@/features/resume/builder/draft";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { makeSectionItem } from "@/libs/resume/make-section-item";
import { createSectionItem, updateSectionItem } from "@/libs/resume/section-actions";
import { useAppForm, withForm } from "@/libs/tanstack-form";
import { SectionItemDialog } from "./section-item-dialog";

const formSchema = educationItemSchema;

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
	id: "",
	hidden: false,
	school: "",
	degree: "",
	area: "",
	grade: "",
	location: "",
	period: "",
	website: { url: "", label: "", inlineLink: false },
	description: "",
};

export function CreateEducationDialog({ data }: DialogProps<"resume.sections.education.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useUpdateResumeData();

	const form = useAppForm({
		defaultValues: makeSectionItem(defaultValues, data?.item),
		validators: { onSubmit: formSchema },
		onSubmit: ({ value }) => {
			updateResumeData((draft) => {
				createSectionItem(draft, "education", value, data?.customSectionId);
			});
			closeDialog();
		},
	});

	const { requestClose } = useFormBlocker(form);
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

	return (
		<SectionItemDialog
			title={<Trans>Create a new education</Trans>}
			icon={<PlusIcon />}
			onSubmit={() => void form.handleSubmit()}
			onCancel={requestClose}
			isSubmitting={isSubmitting}
			submitLabel={<Trans>Create</Trans>}
		>
			<EducationForm form={form} />
		</SectionItemDialog>
	);
}

export function UpdateEducationDialog({ data }: DialogProps<"resume.sections.education.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useUpdateResumeData();

	const form = useAppForm({
		defaultValues: data.item,
		validators: { onSubmit: formSchema },
		onSubmit: ({ value }) => {
			updateResumeData((draft) => {
				updateSectionItem(draft, "education", value, data?.customSectionId);
			});
			closeDialog();
		},
	});

	const { requestClose } = useFormBlocker(form);
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

	return (
		<SectionItemDialog
			title={<Trans>Update an existing education</Trans>}
			icon={<PencilSimpleLineIcon />}
			onSubmit={() => void form.handleSubmit()}
			onCancel={requestClose}
			isSubmitting={isSubmitting}
			submitLabel={<Trans>Save Changes</Trans>}
		>
			<EducationForm form={form} />
		</SectionItemDialog>
	);
}

const EducationForm = withForm({
	defaultValues,
	render: function EducationFormRenderer({ form }) {
		const inlineLink = useStore(form.store, (s) => s.values.website.inlineLink);

		return (
			<>
				<form.AppField name="school">{(field) => <field.TextField label={<Trans>School</Trans>} />}</form.AppField>

				<form.AppField name="area">{(field) => <field.TextField label={<Trans>Area of Study</Trans>} />}</form.AppField>

				<form.AppField name="degree">{(field) => <field.TextField label={<Trans>Degree</Trans>} />}</form.AppField>

				<form.AppField name="grade">{(field) => <field.TextField label={<Trans>Grade</Trans>} />}</form.AppField>

				<form.AppField name="location">{(field) => <field.TextField label={<Trans>Location</Trans>} />}</form.AppField>

				<form.AppField name="period">{(field) => <field.TextField label={<Trans>Period</Trans>} />}</form.AppField>

				<form.AppField name="website">
					{(field) => (
						<field.WebsiteField
							label={<Trans>Website</Trans>}
							formItemClassName="sm:col-span-full"
							hideLabelButton={inlineLink}
						/>
					)}
				</form.AppField>

				<form.Field name="website.inlineLink">
					{(field) => (
						<FormItem className="flex items-center gap-x-2 sm:col-span-full">
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
