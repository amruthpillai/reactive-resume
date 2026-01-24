import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon } from "@phosphor-icons/react";
import { useForm, useFormContext } from "react-hook-form";
import type z from "zod";
import { useResumeStore } from "@/components/resume/store/resume";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { DialogProps } from "@/dialogs/store";
import { useDialogStore } from "@/dialogs/store";
import { languageItemSchema } from "@/schema/resume/data";
import { generateId } from "@/utils/string";

const formSchema = languageItemSchema;

type FormValues = z.infer<typeof formSchema>;

export function CreateLanguageDialog({ data }: DialogProps<"resume.sections.languages.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: generateId(),
			hidden: data?.item?.hidden ?? false,
			language: data?.item?.language ?? "",
			fluency: data?.item?.fluency ?? "",
			level: data?.item?.level ?? 0,
		},
	});

	const onSubmit = (formData: FormValues) => {
		updateResumeData((draft) => {
			if (data?.customSectionId) {
				const section = draft.customSections.find((s) => s.id === data.customSectionId);
				if (section) section.items.push(formData);
			} else {
				draft.sections.languages.items.push(formData);
			}
		});
		closeDialog();
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PlusIcon />
					<Trans>Create a new language</Trans>
				</DialogTitle>
				<DialogDescription />
			</DialogHeader>

			<Form {...form}>
				<form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
					<LanguageForm />

					<DialogFooter className="sm:col-span-full">
						<Button variant="ghost" onClick={closeDialog}>
							<Trans>Cancel</Trans>
						</Button>

						<Button type="submit" disabled={form.formState.isSubmitting}>
							<Trans>Create</Trans>
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}

export function UpdateLanguageDialog({ data }: DialogProps<"resume.sections.languages.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: data.item.id,
			hidden: data.item.hidden,
			language: data.item.language,
			fluency: data.item.fluency,
			level: data.item.level,
		},
	});

	const onSubmit = (formData: FormValues) => {
		updateResumeData((draft) => {
			if (data?.customSectionId) {
				const section = draft.customSections.find((s) => s.id === data.customSectionId);
				if (!section) return;
				const index = section.items.findIndex((item) => item.id === formData.id);
				if (index !== -1) section.items[index] = formData;
			} else {
				const index = draft.sections.languages.items.findIndex((item) => item.id === formData.id);
				if (index !== -1) draft.sections.languages.items[index] = formData;
			}
		});
		closeDialog();
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PencilSimpleLineIcon />
					<Trans>Update an existing language</Trans>
				</DialogTitle>
				<DialogDescription />
			</DialogHeader>

			<Form {...form}>
				<form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
					<LanguageForm />

					<DialogFooter className="sm:col-span-full">
						<Button variant="ghost" onClick={closeDialog}>
							<Trans>Cancel</Trans>
						</Button>

						<Button type="submit" disabled={form.formState.isSubmitting}>
							<Trans>Save Changes</Trans>
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}

function LanguageForm() {
	const form = useFormContext<FormValues>();

	return (
		<>
			<FormField
				control={form.control}
				name="language"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Trans>Language</Trans>
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
				name="fluency"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Trans>Fluency</Trans>
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
				name="level"
				render={({ field }) => (
					<FormItem className="gap-4 sm:col-span-full">
						<FormLabel>
							<Trans>Level</Trans>
						</FormLabel>
						<FormControl>
							<Slider
								min={0}
								max={5}
								step={1}
								value={[field.value]}
								onValueChange={(value) => field.onChange(value[0])}
							/>
						</FormControl>
						<FormMessage />
						<FormDescription>{Number(field.value) === 0 ? t`Hidden` : `${field.value} / 5`}</FormDescription>
					</FormItem>
				)}
			/>
		</>
	);
}
