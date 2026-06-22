import type { DialogProps } from "../store";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { blankCustomTemplateData, defaultCustomTemplateData } from "@reactive-resume/schema/custom-template";
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
import { CometCard } from "@/components/animation/comet-card";
import { templates } from "@/dialogs/resume/template/data";
import { orpc } from "@/libs/orpc/client";
import { useAppForm } from "@/libs/tanstack-form";
import { useDialogStore } from "../store";

const formSchema = z.object({
	name: z.string().min(1).max(64),
	baseTemplate: z.string().min(1),
	startBlank: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateCustomTemplateDialog(_: DialogProps<"custom-template.create">) {
	const navigate = useNavigate();
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const [step, setStep] = useState<1 | 2>(1);

	const { mutate: createTemplate, isPending } = useMutation(orpc.customTemplate.create.mutationOptions());

	const form = useAppForm({
		defaultValues: {
			name: "",
			baseTemplate: "azurill",
			startBlank: false,
		} as FormValues,
		validators: { onSubmit: formSchema },
		onSubmit: ({ value }) => {
			const toastId = toast.loading(t`Creating your template...`);

			createTemplate(
				{
					name: value.name,
					data: value.startBlank
						? blankCustomTemplateData(value.baseTemplate)
						: defaultCustomTemplateData(value.baseTemplate),
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
	const startBlank = useStore(form.store, (s) => s.values.startBlank);

	const chooseBlank = () => {
		form.setFieldValue("startBlank", true);
		setStep(2);
	};
	const chooseTemplate = (id: string) => {
		form.setFieldValue("startBlank", false);
		form.setFieldValue("baseTemplate", id);
		setStep(2);
	};

	// ── Step 1: choose a starting point ──
	if (step === 1) {
		return (
			// style overrides Tailwind's `grid` + `overflow-y-auto` so the grid scrolls within a fixed-height dialog.
			<DialogContent className="overflow-hidden lg:max-w-4xl" style={{ display: "flex", flexDirection: "column" }}>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-x-2">
						<PlusIcon />
						<Trans>Create a new template</Trans>
					</DialogTitle>
					<DialogDescription>
						<Trans>Choose a starting point — a blank canvas or a template. This also sets the styling.</Trans>
					</DialogDescription>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto">
					<div className="grid grid-cols-2 gap-3 p-1 sm:grid-cols-3 lg:grid-cols-4">
						<button
							type="button"
							onClick={chooseBlank}
							className="cursor-pointer rounded-md border-2 border-transparent p-0 text-left transition-all hover:border-primary"
						>
							<CometCard translateDepth={2} rotateDepth={4}>
								<div className="relative flex aspect-page flex-col items-center justify-center gap-2 overflow-hidden rounded border border-muted-foreground/25 border-dashed bg-popover">
									<PlusIcon className="size-7 text-muted-foreground/60" />
									<div className="absolute inset-x-0 bottom-0 bg-background/60 px-2 py-1 backdrop-blur-xs">
										<p className="truncate font-medium text-xs">
											<Trans>Blank canvas</Trans>
										</p>
									</div>
								</div>
							</CometCard>
						</button>

						{Object.entries(templates).map(([id, meta]) => (
							<button
								key={id}
								type="button"
								onClick={() => chooseTemplate(id)}
								className="cursor-pointer rounded-md border-2 border-transparent p-0 text-left transition-all hover:border-primary"
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
			</DialogContent>
		);
	}

	// ── Step 2: name the template ──
	const startingPointLabel = startBlank
		? t`Blank canvas`
		: (templates[selectedBase as keyof typeof templates]?.name ?? selectedBase);

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PlusIcon />
					<Trans>Name your template</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Give your template a name to finish creating it.</Trans>
				</DialogDescription>
			</DialogHeader>

			<form
				className="space-y-4"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<div className="flex items-center gap-2 rounded-md border bg-secondary/30 px-3 py-2 text-sm">
					<span className="text-muted-foreground">
						<Trans>Starting from</Trans>
					</span>
					<span className="font-medium">{startingPointLabel}</span>
				</div>

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

				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => setStep(1)}>
						<Trans>Back</Trans>
					</Button>
					<Button type="submit" disabled={isPending}>
						<Trans>Create &amp; Edit</Trans>
					</Button>
				</DialogFooter>
			</form>
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
