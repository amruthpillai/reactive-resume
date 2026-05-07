import type z from "zod";
import type { DialogProps } from "@/dialogs/store";
import { Trans } from "@lingui/react/macro";
import { AtIcon, PencilSimpleLineIcon, PlusIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { profileItemSchema } from "@reactive-resume/schema/resume/data";
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
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@reactive-resume/ui/components/input-group";
import { PopoverTrigger } from "@reactive-resume/ui/components/popover";
import { Switch } from "@reactive-resume/ui/components/switch";
import { cn } from "@reactive-resume/utils/style";
import { ColorPicker } from "@/components/input/color-picker";
import { IconPicker } from "@/components/input/icon-picker";
import { URLInput } from "@/components/input/url-input";
import { useUpdateResumeData } from "@/components/resume/use-resume";
import { useDialogStore } from "@/dialogs/store";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { makeSectionItem } from "@/libs/resume/make-section-item";
import { createSectionItem, updateSectionItem } from "@/libs/resume/section-actions";
import { useAppForm, withForm } from "@/libs/tanstack-form";

const formSchema = profileItemSchema;

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
	id: "",
	hidden: false,
	icon: "acorn",
	iconColor: "",
	network: "",
	username: "",
	website: { url: "", label: "", inlineLink: false },
};

export function CreateProfileDialog({ data }: DialogProps<"resume.sections.profiles.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useUpdateResumeData();

	const form = useAppForm({
		defaultValues: makeSectionItem(defaultValues, data?.item),
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			updateResumeData((draft) => {
				createSectionItem(draft, "profiles", value, data?.customSectionId);
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
					<Trans>Create a new profile</Trans>
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
				<ProfileForm form={form} />

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

export function UpdateProfileDialog({ data }: DialogProps<"resume.sections.profiles.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useUpdateResumeData();

	const form = useAppForm({
		defaultValues: data.item,
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			updateResumeData((draft) => {
				updateSectionItem(draft, "profiles", value, data?.customSectionId);
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
					<Trans>Update an existing profile</Trans>
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
				<ProfileForm form={form} />

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

const ProfileForm = withForm({
	defaultValues,
	render: ({ form }) => {
		const networkMeta = useStore(form.store, (s) => s.fieldMeta?.network);
		const inlineLink = useStore(form.store, (s) => s.values.website.inlineLink);

		const isNetworkInvalid = (networkMeta?.isTouched ?? false) && (networkMeta?.errors?.length ?? 0) > 0;

		return (
			<>
				<div className={cn("flex items-end", isNetworkInvalid && "items-center")}>
					<form.Field name="icon">
						{(field) => (
							<FormItem className="shrink-0">
								<FormControl
									render={
										<IconPicker
											value={field.state.value}
											onChange={(icon: string) => {
												field.handleChange(icon);
											}}
											popoverProps={{ modal: true }}
											className="rounded-r-none border-input border-e-0"
										/>
									}
								/>
							</FormItem>
						)}
					</form.Field>

					<form.Field name="network">
						{(field) => (
							<FormItem className="flex-1" hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
								<FormLabel>
									<Trans>Network</Trans>
								</FormLabel>
								<FormControl
									render={
										<Input
											className="rounded-s-none rounded-e-none"
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

					<form.Field name="iconColor">
						{(field) => (
							<FormItem className="shrink-0">
								<FormControl
									render={
										<ColorPicker
											value={field.state.value}
											onChange={(v: string) => {
												field.handleChange(v);
											}}
											trigger={
												<PopoverTrigger className="h-9 rounded-e border-input border-y border-e px-2">
													<div
														className="size-4 shrink-0 cursor-pointer rounded-full border border-foreground/60 transition-all hover:scale-105 focus-visible:outline-hidden"
														style={{ backgroundColor: field.state.value ?? "currentColor" }}
													/>
												</PopoverTrigger>
											}
										/>
									}
								/>
							</FormItem>
						)}
					</form.Field>
				</div>

				<form.Field name="username">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Username</Trans>
							</FormLabel>
							<InputGroup>
								<InputGroupAddon align="inline-start">
									<InputGroupText>
										<AtIcon />
									</InputGroupText>
								</InputGroupAddon>

								<FormControl
									render={
										<InputGroupInput
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
									}
								/>
							</InputGroup>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

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
							<FormLabel className="mt-0!">
								<Trans>Show link in title</Trans>
							</FormLabel>
						</FormItem>
					)}
				</form.Field>
			</>
		);
	},
});
