import { zodResolver } from "@hookform/resolvers/zod";
import { CaretDownIcon, MagicWandIcon, PencilSimpleLineIcon, PlusIcon, TestTubeIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { ChipInput } from "@/components/input/chip-input";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { authClient } from "@/integrations/auth/client";
import { orpc, type RouterInput } from "@/integrations/orpc/client";
import { generateId, generateRandomName, slugify } from "@/utils/string";
import { type DialogProps, useDialogStore } from "../store";

const formSchema = z.object({
	id: z.string(),
	name: z.string().min(1).max(64),
	slug: z.string().min(1).max(64).transform(slugify),
	tags: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateResumeDialog(_: DialogProps<"resume.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const { mutate: createResume, isPending } = useMutation(orpc.resume.create.mutationOptions());

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: generateId(),
			name: "",
			slug: "",
			tags: [],
		},
	});

	const name = useWatch({ control: form.control, name: "name" });

	useEffect(() => {
		form.setValue("slug", slugify(name), { shouldDirty: true });
	}, [form, name]);

	const { blockEvents } = useFormBlocker(form);

	const onSubmit = (data: FormValues) => {
		const toastId = toast.loading("Creating your resume...");

		createResume(data, {
			onSuccess: () => {
				toast.success("Your resume has been created successfully.", { id: toastId });
				closeDialog();
			},
			onError: (error) => {
				if (error.message === "RESUME_SLUG_ALREADY_EXISTS") {
					toast.error("A resume with this slug already exists.", { id: toastId });
					return;
				}

				toast.error(error.message, { id: toastId });
			},
		});
	};

	const onCreateSampleResume = () => {
		const values = form.getValues();
		const randomName = generateRandomName();

		const data = {
			name: values.name || randomName,
			slug: values.slug || slugify(randomName),
			tags: values.tags,
			withSampleData: true,
		} satisfies RouterInput["resume"]["create"];

		const toastId = toast.loading("Creating your resume...");

		createResume(data, {
			onSuccess: () => {
				toast.success("Your resume has been created successfully.", { id: toastId });
				closeDialog();
			},
			onError: (error) => {
				toast.error(error.message, { id: toastId });
			},
		});
	};

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PlusIcon />
					Create a new resume
				</DialogTitle>
				<DialogDescription>
					Start building your resume by giving it a name.
				</DialogDescription>
			</DialogHeader>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<ResumeForm />

					<DialogFooter>
						<ButtonGroup aria-label="Create Resume with Options" className="gap-x-px rtl:flex-row-reverse">
							<Button type="submit" disabled={isPending}>
								Create
							</Button>

							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button size="icon" disabled={isPending}>
										<CaretDownIcon />
									</Button>
								</DropdownMenuTrigger>

								<DropdownMenuContent align="end" className="w-fit">
									<DropdownMenuItem onSelect={onCreateSampleResume}>
										<TestTubeIcon />
										Create a Sample Resume
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</ButtonGroup>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}

export function UpdateResumeDialog({ data }: DialogProps<"resume.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const { mutate: updateResume, isPending } = useMutation(orpc.resume.update.mutationOptions());

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: data.id,
			name: data.name,
			slug: data.slug,
			tags: data.tags,
		},
	});

	const name = useWatch({ control: form.control, name: "name" });

	useEffect(() => {
		if (!name) return;
		form.setValue("slug", slugify(name), { shouldDirty: true });
	}, [form, name]);

	const { blockEvents } = useFormBlocker(form);

	const onSubmit = (data: FormValues) => {
		const toastId = toast.loading("Updating your resume...");

		updateResume(data, {
			onSuccess: () => {
				toast.success("Your resume has been updated successfully.", { id: toastId });
				closeDialog();
			},
			onError: (error) => {
				if (error.message === "RESUME_SLUG_ALREADY_EXISTS") {
					toast.error("A resume with this slug already exists.", { id: toastId });
					return;
				}

				toast.error(error.message, { id: toastId });
			},
		});
	};

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PencilSimpleLineIcon />
					Update Resume
				</DialogTitle>
				<DialogDescription>
					Changed your mind? Rename your resume to something more descriptive.
				</DialogDescription>
			</DialogHeader>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<ResumeForm />

					<DialogFooter>
						<Button type="submit" disabled={isPending}>
							Save Changes
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}

export function DuplicateResumeDialog({ data }: DialogProps<"resume.duplicate">) {
	const navigate = useNavigate();
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const { mutate: duplicateResume, isPending } = useMutation(orpc.resume.duplicate.mutationOptions());

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			id: data.id,
			name: `${data.name} (Copy)`,
			slug: `${data.slug}-copy`,
			tags: data.tags,
		},
	});

	const name = useWatch({ control: form.control, name: "name" });

	useEffect(() => {
		if (!name) return;
		form.setValue("slug", slugify(name), { shouldDirty: true });
	}, [form, name]);

	const { blockEvents } = useFormBlocker(form);

	const onSubmit = (values: FormValues) => {
		const toastId = toast.loading("Duplicating your resume...");

		duplicateResume(values, {
			onSuccess: async (id) => {
				toast.success("Your resume has been duplicated successfully.", { id: toastId });
				closeDialog();

				if (data.shouldRedirect) {
					navigate({ to: `/builder/$resumeId`, params: { resumeId: id } });
				}
			},
			onError: (error) => {
				toast.error(error.message, { id: toastId });
			},
		});
	};

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PencilSimpleLineIcon />
					Duplicate Resume
				</DialogTitle>
				<DialogDescription>
					Duplicate your resume to create a new one, just like the original.
				</DialogDescription>
			</DialogHeader>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<ResumeForm />

					<DialogFooter>
						<Button type="submit" disabled={isPending}>
							Duplicate
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}

function ResumeForm() {
	const form = useFormContext<FormValues>();
	const { data: session } = authClient.useSession();

	const slugPrefix = useMemo(() => {
		return `${window.location.origin}/${session?.user.username ?? ""}/`;
	}, [session]);

	const onGenerateName = () => {
		form.setValue("name", generateRandomName(), { shouldDirty: true });
	};

	return (
		<>
			<FormField
				control={form.control}
				name="name"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							Name
						</FormLabel>
						<div className="flex items-center gap-x-2">
							<FormControl>
								<Input min={1} max={64} {...field} />
							</FormControl>

							<Button size="icon" variant="outline" title={"Generate a random name"} onClick={onGenerateName}>
								<MagicWandIcon />
							</Button>
						</div>
						<FormMessage />
						<FormDescription>
							Tip: You can name the resume referring to the position you are applying for.
						</FormDescription>
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="slug"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							Slug
						</FormLabel>
						<FormControl>
							<InputGroup>
								<InputGroupAddon align="inline-start" className="hidden sm:flex">
									<InputGroupText>{slugPrefix}</InputGroupText>
								</InputGroupAddon>
								<InputGroupInput min={1} max={64} className="ps-0!" {...field} />
							</InputGroup>
						</FormControl>
						<FormMessage />
						<FormDescription>
							This is a URL-friendly name for your resume.
						</FormDescription>
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="tags"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							Tags
						</FormLabel>
						<FormControl>
							<ChipInput {...field} />
						</FormControl>
						<FormMessage />
						<FormDescription>
							Tags can be used to categorize your resume by keywords.
						</FormDescription>
					</FormItem>
				)}
			/>
		</>
	);
}
