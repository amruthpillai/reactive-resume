import type { DialogProps } from "../store";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";
import { defaultCustomTemplateData } from "@reactive-resume/schema/custom-template";
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
import { cn } from "@reactive-resume/utils/style";
import { CometCard } from "@/components/animation/comet-card";
import { templates } from "@/dialogs/resume/template/data";
import { orpc } from "@/libs/orpc/client";
import { useAppForm } from "@/libs/tanstack-form";
import { useDialogStore } from "../store";

const formSchema = z.object({
	name: z.string().min(1).max(64),
	baseTemplate: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateCustomTemplateDialog(_: DialogProps<"custom-template.create">) {
	const navigate = useNavigate();
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const { mutate: createTemplate, isPending } = useMutation(orpc.customTemplate.create.mutationOptions());

	const form = useAppForm({
		defaultValues: {
			name: "",
			baseTemplate: "azurill",
		} as FormValues,
		validators: { onSubmit: formSchema },
		onSubmit: ({ value }) => {
			const toastId = toast.loading(t`Creating your template...`);

			createTemplate(
				{
					name: value.name,
					data: defaultCustomTemplateData(value.baseTemplate),
				},
				{
					onSuccess: (id) => {
						toast.success(t`Your template has been created.`, { id: toastId });
						closeDialog();
						void navigate({ to: "/template-editor/$templateId", params: { templateId: id } });
					},
					onError: () => {
						toast.error(t`Failed to create template.`, { id: toastId });
					},
				},
			);
		},
	});

	const selectedBase = useStore(form.store, (s) => s.values.baseTemplate);

	return (
		// style overrides Tailwind's `grid` + `overflow-y-auto` on DialogContent so the
		// footer is always pinned at the bottom regardless of how tall the template grid is.
		<DialogContent className="overflow-hidden lg:max-w-4xl" style={{ display: "flex", flexDirection: "column" }}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PlusIcon />
					<Trans>Create a new template</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Give your template a name and choose a base template to start from.</Trans>
				</DialogDescription>
			</DialogHeader>

			{/* This div takes the remaining height and scrolls independently */}
			<div className="min-h-0 flex-1 overflow-y-auto">
				<form
					className="space-y-4 py-1"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
				>
					<form.Field name="name">
						{(field) => (
							<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
								<FormLabel>
									<Trans>Template Name</Trans>
								</FormLabel>
								<FormControl
									render={
										<Input
											autoFocus
											min={1}
											max={64}
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

					<div className="space-y-2">
						<FormLabel>
							<Trans>Base Template</Trans>
						</FormLabel>
						<div className="grid grid-cols-2 gap-3 p-1 sm:grid-cols-3 lg:grid-cols-4">
							{Object.entries(templates).map(([id, meta]) => (
								<button
									key={id}
									type="button"
									onClick={() => form.setFieldValue("baseTemplate", id)}
									className={cn(
										"cursor-pointer rounded-md border-2 p-0 text-left transition-all",
										selectedBase === id ? "border-primary" : "border-transparent hover:border-muted",
									)}
								>
									<CometCard translateDepth={2} rotateDepth={4}>
										<div className="relative aspect-page overflow-hidden rounded bg-popover">
											<img src={meta.imageUrl} alt={meta.name} className="size-full object-cover object-top" />
											<div className="absolute inset-x-0 bottom-0 bg-background/60 px-2 py-1 backdrop-blur-xs">
												<p className="truncate font-medium text-xs">{meta.name}</p>
											</div>
										</div>
									</CometCard>
								</button>
							))}
						</div>
					</div>
				</form>
			</div>

			<DialogFooter>
				<Button disabled={isPending} onClick={() => void form.handleSubmit()}>
					<Trans>Create &amp; Edit</Trans>
				</Button>
			</DialogFooter>
		</DialogContent>
	);
}

export function UpdateCustomTemplateDialog({ data }: DialogProps<"custom-template.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const { mutate: updateTemplate, isPending } = useMutation(orpc.customTemplate.update.mutationOptions());

	const form = useAppForm({
		defaultValues: { name: data.name },
		validators: { onSubmit: z.object({ name: z.string().min(1).max(64) }) },
		onSubmit: ({ value }) => {
			updateTemplate(
				{ id: data.id, name: value.name },
				{
					onSuccess: () => {
						toast.success(t`Template updated.`);
						closeDialog();
					},
					onError: () => toast.error(t`Failed to update template.`),
				},
			);
		},
	});

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PencilSimpleLineIcon />
					<Trans>Rename Template</Trans>
				</DialogTitle>
			</DialogHeader>

			<form
				className="space-y-4"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<form.Field name="name">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Name</Trans>
							</FormLabel>
							<FormControl
								render={
									<Input
										autoFocus
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<DialogFooter>
					<Button disabled={isPending} onClick={() => void form.handleSubmit()}>
						<Trans>Save</Trans>
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}

export function DeleteCustomTemplateDialog({ data }: DialogProps<"custom-template.delete">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const { mutate: deleteTemplate, isPending } = useMutation(orpc.customTemplate.delete.mutationOptions());

	const handleDelete = () => {
		deleteTemplate(
			{ id: data.id },
			{
				onSuccess: () => {
					toast.success(t`Template deleted.`);
					closeDialog();
				},
				onError: () => toast.error(t`Failed to delete template.`),
			},
		);
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2 text-destructive">
					<TrashSimpleIcon />
					<Trans>Delete Template</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>
						Are you sure you want to delete <strong>{data.name}</strong>? This action cannot be undone.
					</Trans>
				</DialogDescription>
			</DialogHeader>

			<DialogFooter>
				<Button variant="outline" onClick={closeDialog}>
					<Trans>Cancel</Trans>
				</Button>
				<Button variant="destructive" disabled={isPending} onClick={handleDelete}>
					<Trans>Delete</Trans>
				</Button>
			</DialogFooter>
		</DialogContent>
	);
}
