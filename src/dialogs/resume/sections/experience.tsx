import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon, RowsIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { AnimatePresence, Reorder, useDragControls } from "motion/react";
import { useMemo } from "react";
import { useFieldArray, useForm, useFormContext } from "react-hook-form";
import type z from "zod";
import { RichInput } from "@/components/input/rich-input";
import { URLInput } from "@/components/input/url-input";
import { useResumeStore } from "@/components/resume/store/resume";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { DialogProps } from "@/dialogs/store";
import { useDialogStore } from "@/dialogs/store";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import type { RoleItem } from "@/schema/resume/data";
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
		<DialogPopup {...blockEvents}>
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
		</DialogPopup>
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
		<DialogPopup {...blockEvents}>
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
		</DialogPopup>
	);
}

type RoleFieldsProps = {
	role: RoleItem;
	index: number;
	onRemove: () => void;
};

function RoleFields({ role, index, onRemove }: RoleFieldsProps) {
	const form = useFormContext<FormValues>();
	const controls = useDragControls();

	return (
		<Reorder.Item
			value={role}
			dragListener={false}
			dragControls={controls}
			initial={{ opacity: 1, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			className="relative grid rounded border sm:col-span-full sm:grid-cols-2"
		>
			<div className="col-span-full flex items-center justify-between rounded-t bg-border/30 px-2 py-1.5">
				<Button
					size="sm"
					variant="ghost"
					className="cursor-grab touch-none"
					onPointerDown={(e) => {
						e.preventDefault();
						controls.start(e);
					}}
				>
					<RowsIcon />
					<Trans>Reorder</Trans>
				</Button>

				<Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onRemove}>
					<TrashSimpleIcon />
					<Trans>Remove</Trans>
				</Button>
			</div>

			<div className="grid gap-4 p-4 sm:col-span-full sm:grid-cols-2">
				<FormField
					control={form.control}
					name={`roles.${index}.position`}
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<Trans>Position</Trans>
							</FormLabel>
							<FormControl render={<Input {...field} />} />
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
							<FormControl render={<Input {...field} />} />
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
							<FormControl render={<RichInput {...field} value={field.value} onChange={field.onChange} />} />
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>
		</Reorder.Item>
	);
}

function ExperienceForm() {
	const form = useFormContext<FormValues>();

	const { fields, append, remove } = useFieldArray({
		name: "roles",
		keyName: "fieldId",
		control: form.control,
	});

	const hasRoles = useMemo(() => fields.length > 0, [fields]);

	const handleReorderRoles = (newOrder: RoleItem[]) => {
		form.setValue("roles", newOrder);
	};

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
						<FormControl render={<Input {...field} />} />
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="position"
				render={({ field }) => (
					<FormItem>
						<FormLabel>{hasRoles ? <Trans>Overall Title (optional)</Trans> : <Trans>Position</Trans>}</FormLabel>
						<FormControl
							render={<Input {...field} placeholder={hasRoles ? "e.g. Software Engineer → Senior Engineer" : ""} />}
						/>
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
						<FormControl render={<Input {...field} />} />
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="period"
				render={({ field }) => (
					<FormItem>
						<FormLabel>{hasRoles ? <Trans>Overall Period</Trans> : <Trans>Period</Trans>}</FormLabel>
						<FormControl render={<Input {...field} placeholder={hasRoles ? "e.g. 2018 – Present" : ""} />} />
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
						<URLInput
							{...field}
							value={field.value}
							onChange={field.onChange}
							hideLabelButton={form.watch("options.showLinkInTitle")}
						/>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="options.showLinkInTitle"
				render={({ field }) => (
					<FormItem className="flex items-center gap-x-2 sm:col-span-full">
						<FormControl render={<Switch checked={field.value} onCheckedChange={field.onChange} />} />
						<FormLabel>
							<Trans>Show link in title</Trans>
						</FormLabel>
					</FormItem>
				)}
			/>

			{/* Role Progression */}
			<div className="flex items-center justify-between sm:col-span-full">
				<div className="space-y-1">
					<p className="font-medium text-foreground">
						<Trans>Role Progression</Trans>
					</p>
					<p className="text-muted-foreground text-xs">
						<Trans>Add multiple roles to show career progression at the same company.</Trans>
					</p>
				</div>

				<Button
					size="sm"
					variant="outline"
					className="shrink-0"
					onClick={() => append({ id: generateId(), position: "", period: "", description: "" })}
				>
					<PlusIcon />
					<Trans>Add Role</Trans>
				</Button>
			</div>

			{hasRoles && (
				<Reorder.Group
					axis="y"
					values={fields}
					onReorder={handleReorderRoles}
					className="flex flex-col gap-4 sm:col-span-full"
				>
					<AnimatePresence>
						{fields.map((field, index) => (
							<RoleFields key={field.id} role={fields[index]} index={index} onRemove={() => remove(index)} />
						))}
					</AnimatePresence>
				</Reorder.Group>
			)}

			{/* Single Role Description — only show when no roles are defined */}
			{!hasRoles && (
				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem className="sm:col-span-full">
							<FormLabel>
								<Trans>Description</Trans>
							</FormLabel>
							<FormControl render={<RichInput {...field} value={field.value} onChange={field.onChange} />} />
							<FormMessage />
						</FormItem>
					)}
				/>
			)}
		</>
	);
}
