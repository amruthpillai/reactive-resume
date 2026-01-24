import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { AtIcon, PencilSimpleLineIcon, PlusIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { useForm, useFormContext, useFormState } from "react-hook-form";
import type z from "zod";
import { IconPicker } from "@/components/input/icon-picker";
import { URLInput } from "@/components/input/url-input";
import { useResumeStore } from "@/components/resume/store/resume";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { type DialogProps, useDialogStore } from "@/dialogs/store";
import { profileItemSchema } from "@/schema/resume/data";
import { generateId } from "@/utils/string";
import { cn } from "@/utils/style";

const formSchema = profileItemSchema;

type FormValues = z.infer<typeof formSchema>;

export function CreateProfileDialog({ data }: DialogProps<"resume.sections.profiles.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: generateId(),
			hidden: data?.item?.hidden ?? false,
			icon: data?.item?.icon ?? "acorn",
			network: data?.item?.network ?? "",
			username: data?.item?.username ?? "",
			website: data?.item?.website ?? { url: "", label: "" },
		},
	});

	const onSubmit = (formData: FormValues) => {
		updateResumeData((draft) => {
			if (data?.customSectionId) {
				const section = draft.customSections.find((s) => s.id === data.customSectionId);
				if (section) section.items.push(formData);
			} else {
				draft.sections.profiles.items.push(formData);
			}
		});
		closeDialog();
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PlusIcon />
					<Trans>Create a new profile</Trans>
				</DialogTitle>
				<DialogDescription />
			</DialogHeader>

			<Form {...form}>
				<form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
					<ProfileForm />

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

export function UpdateProfileDialog({ data }: DialogProps<"resume.sections.profiles.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: data.item.id,
			hidden: data.item.hidden,
			icon: data.item.icon,
			network: data.item.network,
			username: data.item.username,
			website: data.item.website,
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
				const index = draft.sections.profiles.items.findIndex((item) => item.id === formData.id);
				if (index !== -1) draft.sections.profiles.items[index] = formData;
			}
		});
		closeDialog();
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PencilSimpleLineIcon />
					<Trans>Update an existing profile</Trans>
				</DialogTitle>
				<DialogDescription />
			</DialogHeader>

			<Form {...form}>
				<form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
					<ProfileForm />

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

function ProfileForm() {
	const form = useFormContext<FormValues>();
	const networkState = useFormState({ control: form.control, name: "network" });

	const isNetworkInvalid = useMemo(() => {
		return networkState.errors && Object.keys(networkState.errors).length > 0;
	}, [networkState]);

	return (
		<>
			<div className={cn("flex items-end", isNetworkInvalid && "items-center")}>
				<FormField
					control={form.control}
					name={"icon"}
					render={({ field }) => (
						<FormItem className="shrink-0">
							<FormControl>
								<IconPicker {...field} popoverProps={{ modal: true }} className="rounded-r-none! border-r-0!" />
							</FormControl>
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="network"
					render={({ field }) => (
						<FormItem className="flex-1">
							<FormLabel>
								<Trans>Network</Trans>
							</FormLabel>
							<FormControl>
								<Input className="rounded-l-none!" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>

			<FormField
				control={form.control}
				name="username"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Trans>Username</Trans>
						</FormLabel>
						<InputGroup>
							<InputGroupAddon align="inline-start">
								<InputGroupText>
									<AtIcon />
								</InputGroupText>
							</InputGroupAddon>

							<FormControl>
								<InputGroupInput {...field} />
							</FormControl>
						</InputGroup>
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
							<URLInput {...field} value={field.value} onChange={field.onChange} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</>
	);
}
