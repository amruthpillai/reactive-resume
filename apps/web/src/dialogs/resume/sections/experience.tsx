import type { RoleItem } from "@reactive-resume/schema/resume/data";
import type z from "zod";
import type { DialogProps } from "@/dialogs/store";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon, RowsIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { AnimatePresence, Reorder, useDragControls } from "motion/react";
import { experienceItemSchema } from "@reactive-resume/schema/resume/data";
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
import { Switch } from "@reactive-resume/ui/components/switch";
import { generateId } from "@reactive-resume/utils/string";
import { RichInput } from "@/components/input/rich-input";
import { URLInput } from "@/components/input/url-input";
import { useUpdateResumeData } from "@/components/resume/use-resume";
import { useDialogStore } from "@/dialogs/store";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { makeSectionItem } from "@/libs/resume/make-section-item";
import { createSectionItem, updateSectionItem } from "@/libs/resume/section-actions";
import { useAppForm, withForm } from "@/libs/tanstack-form";

const formSchema = experienceItemSchema;

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
	id: "",
	hidden: false,
	company: "",
	position: "",
	location: "",
	period: "",
	website: { url: "", label: "", inlineLink: false },
	description: "",
	roles: [] as RoleItem[],
};

export function CreateExperienceDialog({ data }: DialogProps<"resume.sections.experience.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useUpdateResumeData();

	const form = useAppForm({
		defaultValues: makeSectionItem(defaultValues, data?.item),
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			updateResumeData((draft) => {
				createSectionItem(draft, "experience", value, data?.customSectionId);
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
					<Trans>Create a new experience</Trans>
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
				<ExperienceForm form={form} />

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

export function UpdateExperienceDialog({ data }: DialogProps<"resume.sections.experience.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useUpdateResumeData();

	const form = useAppForm({
		defaultValues: data.item,
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			updateResumeData((draft) => {
				updateSectionItem(draft, "experience", value, data?.customSectionId);
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
					<Trans>Update an existing experience</Trans>
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
				<ExperienceForm form={form} />

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

const ExperienceForm = withForm({
	defaultValues,
	render: ({ form }) => {
		const inlineLink = useStore(form.store, (s) => s.values.website.inlineLink);
		const roles = useStore(form.store, (s) => s.values.roles);
		const hasRoles = roles.length > 0;

		const handleReorderRoles = (newOrder: RoleItem[]) => {
			form.setFieldValue("roles", newOrder);
		};

		const RoleFields = ({ role, index, onRemove }: { role: RoleItem; index: number; onRemove: () => void }) => {
			const controls = useDragControls();

			return (
				<Reorder.Item
					value={role}
					dragListener={false}
					dragControls={controls}
					initial={{ opacity: 1, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -10 }}
					className="relative grid rounded-md border sm:col-span-full sm:grid-cols-2"
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
						<form.Field name={`roles[${index}].position`}>
							{(field) => (
								<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
									<FormLabel>
										<Trans>Position</Trans>
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

						<form.Field name={`roles[${index}].period`}>
							{(field) => (
								<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
									<FormLabel>
										<Trans>Period</Trans>
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

						<form.Field name={`roles[${index}].description`}>
							{(field) => (
								<FormItem
									className="sm:col-span-full"
									hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
								>
									<FormLabel>
										<Trans>Description</Trans>
									</FormLabel>
									<FormControl
										render={<RichInput value={field.state.value} onChange={(v) => field.handleChange(v)} />}
									/>
									<FormMessage errors={field.state.meta.errors} />
								</FormItem>
							)}
						</form.Field>
					</div>
				</Reorder.Item>
			);
		};

		return (
			<>
				<form.AppField name="company">{(field) => <field.TextField label={<Trans>Company</Trans>} />}</form.AppField>

				<form.AppField name="location">{(field) => <field.TextField label={<Trans>Location</Trans>} />}</form.AppField>

				<form.AppField name="position">{(field) => <field.TextField label={<Trans>Position</Trans>} />}</form.AppField>

				<form.AppField name="period">{(field) => <field.TextField label={<Trans>Period</Trans>} />}</form.AppField>

				<form.Field name="website">
					{(field) => (
						<FormItem
							className="sm:col-span-full"
							hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
						>
							<FormLabel>
								<Trans>Website</Trans>
							</FormLabel>
							<URLInput
								value={field.state.value}
								onChange={(v) => field.handleChange(v)}
								hideLabelButton={inlineLink}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

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
							<FormLabel>
								<Trans>Show link in title</Trans>
							</FormLabel>
						</FormItem>
					)}
				</form.Field>

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
						onClick={() => {
							form.pushFieldValue("roles", {
								id: generateId(),
								position: "",
								period: "",
								description: "",
							});
						}}
					>
						<PlusIcon />
						<Trans>Add Role</Trans>
					</Button>
				</div>

				{hasRoles && (
					<form.Field name="roles" mode="array">
						{(rolesField) => (
							<Reorder.Group
								axis="y"
								values={rolesField.state.value}
								onReorder={handleReorderRoles}
								className="flex flex-col gap-4 sm:col-span-full"
							>
								<AnimatePresence>
									{rolesField.state.value.map((role: RoleItem, index: number) => (
										<RoleFields
											key={role.id}
											role={role}
											index={index}
											onRemove={() => {
												rolesField.removeValue(index);
											}}
										/>
									))}
								</AnimatePresence>
							</Reorder.Group>
						)}
					</form.Field>
				)}

				{/* Single Role Description — only show when no roles are defined */}
				{!hasRoles && (
					<form.Field name="description">
						{(field) => (
							<FormItem
								className="sm:col-span-full"
								hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
							>
								<FormLabel>
									<Trans>Description</Trans>
								</FormLabel>
								<FormControl render={<RichInput value={field.state.value} onChange={(v) => field.handleChange(v)} />} />
								<FormMessage errors={field.state.meta.errors} />
							</FormItem>
						)}
					</form.Field>
				)}
			</>
		);
	},
});
