import type z from "zod";
import type { DialogProps } from "@/dialogs/store";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { referenceItemSchema } from "@reactive-resume/schema/resume/data";
import { FormControl, FormItem, FormLabel } from "@reactive-resume/ui/components/form";
import { Switch } from "@reactive-resume/ui/components/switch";
import { useDialogStore } from "@/dialogs/store";
import { useUpdateResumeData } from "@/features/resume/builder/draft";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { makeSectionItem } from "@/libs/resume/make-section-item";
import { createSectionItem, updateSectionItem } from "@/libs/resume/section-actions";
import { useAppForm, withForm } from "@/libs/tanstack-form";
import { SectionItemDialog } from "./section-item-dialog";

const formSchema = referenceItemSchema;

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
	id: "",
	hidden: false,
	name: "",
	position: "",
	website: { url: "", label: "", inlineLink: false },
	phone: "",
	description: "",
};

export function CreateReferenceDialog({ data }: DialogProps<"resume.sections.references.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useUpdateResumeData();

	const form = useAppForm({
		defaultValues: makeSectionItem(defaultValues, data?.item),
		validators: { onSubmit: formSchema },
		onSubmit: ({ value }) => {
			updateResumeData((draft) => {
				createSectionItem(draft, "references", value, data?.customSectionId);
			});
			closeDialog();
		},
	});

	const { requestClose } = useFormBlocker(form);
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

	return (
		<SectionItemDialog
			title={<Trans>Create a new reference</Trans>}
			icon={<PlusIcon />}
			onSubmit={() => void form.handleSubmit()}
			onCancel={requestClose}
			isSubmitting={isSubmitting}
			submitLabel={<Trans>Create</Trans>}
		>
			<ReferenceForm form={form} />
		</SectionItemDialog>
	);
}

export function UpdateReferenceDialog({ data }: DialogProps<"resume.sections.references.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useUpdateResumeData();

	const form = useAppForm({
		defaultValues: data.item,
		validators: { onSubmit: formSchema },
		onSubmit: ({ value }) => {
			updateResumeData((draft) => {
				updateSectionItem(draft, "references", value, data?.customSectionId);
			});
			closeDialog();
		},
	});

	const { requestClose } = useFormBlocker(form);
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

	return (
		<SectionItemDialog
			title={<Trans>Update an existing reference</Trans>}
			icon={<PencilSimpleLineIcon />}
			onSubmit={() => void form.handleSubmit()}
			onCancel={requestClose}
			isSubmitting={isSubmitting}
			submitLabel={<Trans>Save Changes</Trans>}
		>
			<ReferenceForm form={form} />
		</SectionItemDialog>
	);
}

const ReferenceForm = withForm({
	defaultValues,
	render: function ReferenceFormRenderer({ form }) {
		const inlineLink = useStore(form.store, (s) => s.values.website.inlineLink);

		return (
			<>
				<form.AppField name="name">{(field) => <field.TextField label={<Trans>Name</Trans>} />}</form.AppField>

				<form.AppField name="position">{(field) => <field.TextField label={<Trans>Position</Trans>} />}</form.AppField>

				<form.AppField name="phone">{(field) => <field.TextField label={<Trans>Phone</Trans>} />}</form.AppField>

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
