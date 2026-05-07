import type { MessageDescriptor } from "@lingui/core";
import type { CustomSectionType } from "@reactive-resume/schema/resume/data";
import type z from "zod";
import type { DialogProps } from "@/dialogs/store";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { customSectionSchema } from "@reactive-resume/schema/resume/data";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@reactive-resume/ui/components/dialog";
import { FormControl, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import { generateId } from "@reactive-resume/utils/string";
import { useUpdateResumeData } from "@/components/resume/use-resume";
import { Combobox } from "@/components/ui/combobox";
import { useDialogStore } from "@/dialogs/store";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { useAppForm, withForm } from "@/libs/tanstack-form";

const formSchema = customSectionSchema;

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
	id: "",
	title: "",
	type: "experience",
	columns: 1,
	hidden: false,
	items: [],
};

const SECTION_TYPE_OPTIONS: { value: CustomSectionType; label: MessageDescriptor }[] = [
	{ value: "summary", label: msg`Summary` },
	{ value: "experience", label: msg`Experience` },
	{ value: "education", label: msg`Education` },
	{ value: "projects", label: msg`Projects` },
	{ value: "profiles", label: msg`Profiles` },
	{ value: "skills", label: msg`Skills` },
	{ value: "languages", label: msg`Languages` },
	{ value: "interests", label: msg`Interests` },
	{ value: "awards", label: msg`Awards` },
	{ value: "certifications", label: msg`Certifications` },
	{ value: "publications", label: msg`Publications` },
	{ value: "volunteer", label: msg`Volunteer` },
	{ value: "references", label: msg`References` },
	{ value: "cover-letter", label: msg`Cover Letter` },
];

function isCustomSectionType(value: string | null | undefined): value is CustomSectionType {
	return SECTION_TYPE_OPTIONS.some((option) => option.value === value);
}

export function CreateCustomSectionDialog({ data }: DialogProps<"resume.sections.custom.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useUpdateResumeData();

	const form = useAppForm({
		defaultValues: {
			id: generateId(),
			title: data?.title ?? "",
			type: (data?.type ?? "experience") as CustomSectionType,
			columns: data?.columns ?? 1,
			hidden: data?.hidden ?? false,
			items: data?.items ?? [],
		},
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			updateResumeData((draft) => {
				draft.customSections.push(value);
				const lastPageIndex = draft.metadata.layout.pages.length - 1;
				if (lastPageIndex < 0) return;
				draft.metadata.layout.pages[lastPageIndex].main.push(value.id);
			});
			closeDialog();
		},
	});

	const { requestClose } = useFormBlocker(form);
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PlusIcon />
					<Trans>Create a new custom section</Trans>
				</DialogTitle>
				<DialogDescription />
			</DialogHeader>

			<form
				className="grid gap-4 sm:grid-cols-2"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<CreateCustomSectionForm form={form} />

				<DialogFooter className="sm:col-span-full">
					<Button variant="ghost" onClick={requestClose}>
						<Trans>Cancel</Trans>
					</Button>

					<Button type="submit" disabled={isSubmitting}>
						<Trans>Create</Trans>
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}

export function UpdateCustomSectionDialog({ data }: DialogProps<"resume.sections.custom.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useUpdateResumeData();

	const form = useAppForm({
		defaultValues: data,
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			updateResumeData((draft) => {
				const index = draft.customSections.findIndex((item) => item.id === value.id);
				if (index === -1) return;
				draft.customSections[index] = value;
			});
			closeDialog();
		},
	});

	const { requestClose } = useFormBlocker(form);
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PencilSimpleLineIcon />
					<Trans>Update an existing custom section</Trans>
				</DialogTitle>
				<DialogDescription />
			</DialogHeader>

			<form
				className="grid gap-4 sm:grid-cols-2"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<UpdateCustomSectionForm form={form} />

				<DialogFooter className="sm:col-span-full">
					<Button variant="ghost" onClick={requestClose}>
						<Trans>Cancel</Trans>
					</Button>

					<Button type="submit" disabled={isSubmitting}>
						<Trans>Save Changes</Trans>
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}

const CreateCustomSectionForm = withForm({
	defaultValues,
	render: ({ form }) => {
		const { i18n } = useLingui();

		return (
			<>
				<form.Field name="title">
					{(field) => (
						<FormItem
							className="sm:col-span-full"
							hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
						>
							<FormLabel>
								<Trans>Title</Trans>
							</FormLabel>
							<FormControl
								render={
									<Input
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
									/>
								}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<form.Field name="type">
					{(field) => (
						<FormItem
							className="sm:col-span-full"
							hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
						>
							<FormLabel>
								<Trans>Section Type</Trans>
							</FormLabel>
							<FormControl
								render={
									<Combobox
										name={field.name}
										value={field.state.value}
										disabled={false}
										onValueChange={(v) => {
											if (isCustomSectionType(v)) field.handleChange(v);
										}}
										options={SECTION_TYPE_OPTIONS.map((option) => ({
											value: option.value,
											label: i18n.t(option.label),
										}))}
									/>
								}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>
			</>
		);
	},
});

const UpdateCustomSectionForm = withForm({
	defaultValues,
	render: ({ form }) => {
		const { i18n } = useLingui();

		return (
			<>
				<form.Field name="title">
					{(field) => (
						<FormItem
							className="sm:col-span-full"
							hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
						>
							<FormLabel>
								<Trans>Title</Trans>
							</FormLabel>
							<FormControl
								render={
									<Input
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
									/>
								}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<form.Field name="type">
					{(field) => (
						<FormItem
							className="sm:col-span-full"
							hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
						>
							<FormLabel>
								<Trans>Section Type</Trans>
							</FormLabel>
							<FormControl
								render={
									<Combobox
										name={field.name}
										value={field.state.value}
										disabled
										onValueChange={(v) => {
											if (isCustomSectionType(v)) field.handleChange(v);
										}}
										options={SECTION_TYPE_OPTIONS.map((option) => ({
											value: option.value,
											label: i18n.t(option.label),
										}))}
									/>
								}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>
			</>
		);
	},
});
