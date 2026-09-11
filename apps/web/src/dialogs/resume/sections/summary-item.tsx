import type z from "zod";
import type { DialogProps } from "@/dialogs/store";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { summaryItemSchema } from "@reactive-resume/schema/resume/data";
import { FormControl, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { RichInput } from "@/components/input/rich-input";
import { useDialogStore } from "@/dialogs/store";
import { useUpdateResumeData } from "@/features/resume/builder/draft";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { makeSectionItem } from "@/libs/resume/make-section-item";
import { useAppForm, withForm } from "@/libs/tanstack-form";
import { SectionItemDialog } from "./section-item-dialog";

const formSchema = summaryItemSchema;

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
	id: "",
	hidden: false,
	content: "",
};

export function CreateSummaryItemDialog({ data }: DialogProps<"resume.sections.summary.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useUpdateResumeData();

	const form = useAppForm({
		defaultValues: makeSectionItem(defaultValues, data?.item),
		validators: { onSubmit: formSchema },
		onSubmit: ({ value }) => {
			updateResumeData((draft) => {
				if (data?.customSectionId) {
					const section = draft.customSections.find((s) => s.id === data.customSectionId);
					if (section) section.items.push(value);
				}
			});
			closeDialog();
		},
	});

	const { requestClose } = useFormBlocker(form);
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

	return (
		<SectionItemDialog
			title={<Trans>Create a new summary item</Trans>}
			icon={<PlusIcon />}
			onSubmit={() => void form.handleSubmit()}
			onCancel={requestClose}
			isSubmitting={isSubmitting}
			submitLabel={<Trans>Create</Trans>}
			singleColumn
		>
			<SummaryItemForm form={form} />
		</SectionItemDialog>
	);
}

export function UpdateSummaryItemDialog({ data }: DialogProps<"resume.sections.summary.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeStore = useUpdateResumeData();

	const form = useAppForm({
		defaultValues: data.item,
		validators: { onSubmit: formSchema },
		onSubmit: ({ value }) => {
			updateResumeStore((draft) => {
				if (data?.customSectionId) {
					const section = draft.customSections.find((s) => s.id === data.customSectionId);
					if (!section) return;
					const index = section.items.findIndex((item) => item.id === value.id);
					if (index !== -1) section.items[index] = value;
				}
			});
			closeDialog();
		},
	});

	const { requestClose } = useFormBlocker(form);
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

	return (
		<SectionItemDialog
			title={<Trans>Update an existing summary item</Trans>}
			icon={<PencilSimpleLineIcon />}
			onSubmit={() => void form.handleSubmit()}
			onCancel={requestClose}
			isSubmitting={isSubmitting}
			submitLabel={<Trans>Save Changes</Trans>}
			singleColumn
		>
			<SummaryItemForm form={form} />
		</SectionItemDialog>
	);
}

const SummaryItemForm = withForm({
	defaultValues,
	render: ({ form }) => {
		return (
			<form.Field name="content">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Content</Trans>
						</FormLabel>
						<FormControl render={<RichInput value={field.state.value} onChange={(v) => field.handleChange(v)} />} />
						<FormMessage errors={field.state.meta.errors} />
					</FormItem>
				)}
			</form.Field>
		);
	},
});
