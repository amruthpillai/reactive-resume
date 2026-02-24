import { zodResolver } from "@hookform/resolvers/zod";
import { PencilSimpleLineIcon, PlusIcon } from "@phosphor-icons/react";
import { useForm, useFormContext } from "react-hook-form";
import type z from "zod";
import { useResumeStore } from "@/components/resume/store/resume";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { DialogProps } from "@/dialogs/store";
import { useDialogStore } from "@/dialogs/store";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { type CustomSectionType, customSectionSchema } from "@/schema/resume/data";
import { generateId } from "@/utils/string";

const formSchema = customSectionSchema;

type FormValues = z.infer<typeof formSchema>;

const SECTION_TYPE_OPTIONS: { value: CustomSectionType; label: string }[] = [
	{ value: "summary", label: "Summary" },
	{ value: "experience", label: "Experience" },
	{ value: "education", label: "Education" },
	{ value: "projects", label: "Projects" },
	{ value: "profiles", label: "Profiles" },
	{ value: "skills", label: "Skills" },
	{ value: "languages", label: "Languages" },
	{ value: "interests", label: "Interests" },
	{ value: "awards", label: "Awards" },
	{ value: "certifications", label: "Certifications" },
	{ value: "publications", label: "Publications" },
	{ value: "volunteer", label: "Volunteer" },
	{ value: "references", label: "References" },
	{ value: "cover-letter", label: "Cover Letter" },
];

export function CreateCustomSectionDialog({ data }: DialogProps<"resume.sections.custom.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: generateId(),
			title: data?.title ?? "",
			type: data?.type ?? "experience",
			columns: data?.columns ?? 1,
			hidden: data?.hidden ?? false,
			items: data?.items ?? [],
		},
	});

	const onSubmit = (formData: FormValues) => {
		updateResumeData((draft) => {
			draft.customSections.push(formData);

			const lastPageIndex = draft.metadata.layout.pages.length - 1;
			if (lastPageIndex < 0) return;
			draft.metadata.layout.pages[lastPageIndex].main.push(formData.id);
		});
		closeDialog();
	};

	const { blockEvents, requestClose } = useFormBlocker(form);

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PlusIcon />
					Create a new custom section
				</DialogTitle>
				<DialogDescription />
			</DialogHeader>

			<Form {...form}>
				<form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
					<CustomSectionForm />

					<DialogFooter className="sm:col-span-full">
						<Button variant="ghost" onClick={requestClose}>
							Cancel
						</Button>

						<Button type="submit" disabled={form.formState.isSubmitting}>
							Create
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}

export function UpdateCustomSectionDialog({ data }: DialogProps<"resume.sections.custom.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: data.id,
			title: data.title,
			type: data.type,
			columns: data.columns,
			hidden: data.hidden,
			items: data.items,
		},
	});

	const onSubmit = (formData: FormValues) => {
		updateResumeData((draft) => {
			const index = draft.customSections.findIndex((item) => item.id === formData.id);
			if (index === -1) return;
			draft.customSections[index] = formData;
		});
		closeDialog();
	};

	const { blockEvents, requestClose } = useFormBlocker(form);

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PencilSimpleLineIcon />
					Update an existing custom section
				</DialogTitle>
				<DialogDescription />
			</DialogHeader>

			<Form {...form}>
				<form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
					<CustomSectionForm isUpdate />

					<DialogFooter className="sm:col-span-full">
						<Button variant="ghost" onClick={requestClose}>
							Cancel
						</Button>

						<Button type="submit" disabled={form.formState.isSubmitting}>
							Save Changes
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}

function CustomSectionForm({ isUpdate = false }: { isUpdate?: boolean }) {
	const form = useFormContext<FormValues>();

	return (
		<>
			<FormField
				control={form.control}
				name="title"
				render={({ field }) => (
					<FormItem className="sm:col-span-full">
						<FormLabel>
							Title
						</FormLabel>
						<FormControl>
							<Input {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="type"
				render={({ field }) => (
					<FormItem className="sm:col-span-full">
						<FormLabel>
							Section Type
						</FormLabel>
						<FormControl>
							<Combobox
								{...field}
								value={field.value}
								disabled={isUpdate}
								onValueChange={field.onChange}
								options={SECTION_TYPE_OPTIONS.map((option) => ({
									value: option.value,
									label: option.label,
								}))}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</>
	);
}
