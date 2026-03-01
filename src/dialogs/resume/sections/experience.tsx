import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useFieldArray, useForm, useFormContext } from "react-hook-form";
import type z from "zod";
import { RichInput } from "@/components/input/rich-input";
import { URLInput } from "@/components/input/url-input";
import { useResumeStore } from "@/components/resume/store/resume";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { DialogProps } from "@/dialogs/store";
import { useDialogStore } from "@/dialogs/store";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { experienceItemSchema } from "@/schema/resume/data";
import { generateId } from "@/utils/string";

const formSchema = experienceItemSchema;

type FormValues = z.infer<typeof formSchema>;

export function CreateExperienceDialog({ data }: DialogProps<"resume.sections.experience.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: generateId(),
			hidden: data?.item?.hidden ?? false,
			options: data?.item?.options ?? { showLinkInTitle: false },
			company: data?.item?.company ?? "",
			position: data?.item?.position ?? "",
			location: data?.item?.location ?? "",
			period: data?.item?.period ?? "",
			website: data?.item?.website ?? { url: "", label: "" },
			description: data?.item?.description ?? "",
			roles: data?.item?.roles ?? [],
		},
	});

	const onSubmit = (formData: FormValues) => {
		updateResumeData((draft) => {
			if (data?.customSectionId) {
				const section = draft.customSections.find((s) => s.id === data.customSectionId);
				if (section) section.items.push(formData);
			} else {
				draft.sections.experience.items.push(formData);
			}
		});
		closeDialog();
	};

	const { blockEvents, requestClose } = useFormBlocker(form);

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PlusIcon />
					<Trans>Create a new experience</Trans>
				</DialogTitle>
				<DialogDescription />
			</DialogHeader>

			<Form {...form}>
				<form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
					<ExperienceForm />

					<DialogFooter className="sm:col-span-full">
						<Button variant="ghost" onClick={requestClose}>
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

export function UpdateExperienceDialog({ data }: DialogProps<"resume.sections.experience.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: data.item.id,
			hidden: data.item.hidden,
			options: data.item.options ?? { showLinkInTitle: false },
			company: data.item.company,
			position: data.item.position,
			location: data.item.location,
			period: data.item.period,
			website: data.item.website,
			description: data.item.description,
			roles: data.item.roles ?? [],
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
				const index = draft.sections.experience.items.findIndex((item) => item.id === formData.id);
				if (index !== -1) draft.sections.experience.items[index] = formData;
			}
		});
		closeDialog();
	};

	const { blockEvents, requestClose } = useFormBlocker(form);

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PencilSimpleLineIcon />
					<Trans>Update an existing experience</Trans>
				</DialogTitle>
				<DialogDescription />
			</DialogHeader>

			<Form {...form}>
				<form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
					<ExperienceForm />

					<DialogFooter className="sm:col-span-full">
						<Button variant="ghost" onClick={requestClose}>
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

function RoleFields({ index, onRemove }: { index: number; onRemove: () => void }) {
	const form = useFormContext<FormValues>();

	return (
		<div className="sm:col-span-full rounded-md border p-3 grid gap-3 sm:grid-cols-2 relative">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="absolute top-2 right-2 h-6 w-6 text-destructive hover:text-destructive"
				onClick={onRemove}
			>
				<TrashIcon className="h-4 w-4" />
			</Button>

			<FormField
				control={form.control}
				name={`roles.${index}.position`}
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Trans>Position</Trans>
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
				name={`roles.${index}.period`}
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Trans>Period</Trans>
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
				name={`roles.${index}.description`}
				render={({ field }) => (
					<FormItem className="sm:col-span-full">
						<FormLabel>
							<Trans>Description</Trans>
						</FormLabel>
						<FormControl>
							<RichInput {...field} value={field.value} onChange={field.onChange} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	);
}

function ExperienceForm() {
	const form = useFormContext<FormValues>();
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "roles",
	});

	const hasRoles = fields.length > 0;

	return (
		<>
			<FormField
				control={form.control}
				name="company"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Trans>Company</Trans>
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
				name="position"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							{hasRoles ? <Trans>Overall Title (optional)</Trans> : <Trans>Position</Trans>}
						</FormLabel>
						<FormControl>
							<Input
								{...field}
								placeholder={hasRoles ? "e.g. Software Engineer → Senior Engineer" : ""}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="location"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Trans>Location</Trans>
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
				name="period"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							{hasRoles ? <Trans>Overall Period</Trans> : <Trans>Period</Trans>}
						</FormLabel>
						<FormControl>
							<Input
								{...field}
								placeholder={hasRoles ? "e.g. 2018 – Present" : ""}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="website"
				render={({ field }) => (
					<FormItem className="sm:col-span-full">
						<FormLabel>
							<Trans>Website</Trans>
						</FormLabel>
						<FormControl>
							<URLInput
								{...field}
								value={field.value}
								onChange={field.onChange}
								hideLabelButton={form.watch("options.showLinkInTitle")}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="options.showLinkInTitle"
				render={({ field }) => (
					<FormItem className="flex items-center gap-x-2 sm:col-span-full">
						<FormControl>
							<Switch checked={field.value} onCheckedChange={field.onChange} />
						</FormControl>
						<FormLabel className="!mt-0">
							<Trans>Show link in title</Trans>
						</FormLabel>
					</FormItem>
				)}
			/>

			{/* Role Progression Section */}
			<div className="sm:col-span-full flex items-center justify-between pt-1">
				<div>
					<span className="text-sm font-medium text-foreground">
						<Trans>Role Progression</Trans>
					</span>
					{fields.length === 0 && (
						<p className="text-xs text-muted-foreground mt-0.5">
							<Trans>
								Add multiple roles to show career progression at this company.
							</Trans>
						</p>
					)}
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="gap-x-1 shrink-0"
					onClick={() =>
						append({
							id: generateId(),
							position: "",
							period: "",
							description: "",
						})
					}
				>
					<PlusIcon className="h-4 w-4" />
					<Trans>Add Role</Trans>
				</Button>
			</div>

			{fields.map((field, index) => (
				<RoleFields key={field.id} index={index} onRemove={() => remove(index)} />
			))}

			{/* Single-role description — only show when no roles defined */}
			{!hasRoles && (
				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem className="sm:col-span-full">
							<FormLabel>
								<Trans>Description</Trans>
							</FormLabel>
							<FormControl>
								<RichInput {...field} value={field.value} onChange={field.onChange} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			)}
		</>
	);
}
