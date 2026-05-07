import type { DialogProps } from "../store";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CopyIcon, PlusIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import z from "zod";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@reactive-resume/ui/components/dialog";
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@reactive-resume/ui/components/input-group";
import { Combobox } from "@/components/ui/combobox";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { authClient } from "@/libs/auth/client";
import { getReadableErrorMessage } from "@/libs/error-message";
import { useAppForm } from "@/libs/tanstack-form";
import { useDialogStore } from "../store";

const formSchema = z.object({
	name: z.string().min(1).max(64),
	expiresIn: z.number().min(1),
});

export function CreateApiKeyDialog(_: DialogProps<"api-key.create">) {
	const [apiKey, setApiKey] = useState<string | null>(null);

	if (apiKey) return <CopyApiKeyForm apiKey={apiKey} />;

	return <CreateApiKeyForm setApiKey={setApiKey} />;
}

type CreateApiKeyFormProps = {
	setApiKey: (apiKey: string) => void;
};

const CreateApiKeyForm = ({ setApiKey }: CreateApiKeyFormProps) => {
	const form = useAppForm({
		defaultValues: {
			name: "",
			expiresIn: 3600 * 24 * 30,
		},
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			const toastId = toast.loading(t`Creating your API key...`);

			const { data, error } = await authClient.apiKey.create({
				name: value.name,
				expiresIn: value.expiresIn,
			});

			if (error) {
				toast.error(
					getReadableErrorMessage(
						error,
						t({
							comment: "Fallback toast when creating an API key fails",
							message: "Failed to create API key. Please try again.",
						}),
					),
					{ id: toastId },
				);
				return;
			}

			setApiKey(data.key);
			toast.dismiss(toastId);
		},
	});

	useFormBlocker(form);

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PlusIcon />
					<Trans>Create a new API key</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>
						This will generate a new API key to access the Reactive Resume API to allow machines to interact with your
						resume data.
					</Trans>
				</DialogDescription>
			</DialogHeader>

			<form
				className="space-y-6 py-2"
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
							<FormDescription>
								<Trans>
									Tip: Give your API key a name, corresponding to the purpose of the key, to help you identify it later.
								</Trans>
							</FormDescription>
						</FormItem>
					)}
				</form.Field>

				<form.Field name="expiresIn">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Expires in</Trans>
							</FormLabel>
							<FormControl
								render={
									<Combobox
										value={field.state.value}
										onValueChange={(value) => value && field.handleChange(Number(value))}
										options={[
											{
												// 1 month = 30 days
												value: 3600 * 24 * 30,
												label: t`1 month`,
											},
											{
												// 3 months = 90 days
												value: 3600 * 24 * 90,
												label: t`3 months`,
											},
											{
												// 6 months = 180 days
												value: 3600 * 24 * 180,
												label: t`6 months`,
											},
											{
												// 1 year = 365 days
												value: 3600 * 24 * 365,
												label: t`1 year`,
											},
										]}
									/>
								}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<DialogFooter>
					<Button type="submit">
						<Trans comment="Create API key dialog submit action">Create</Trans>
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
};

type CopyApiKeyFormProps = {
	apiKey: string;
};

const CopyApiKeyForm = ({ apiKey }: CopyApiKeyFormProps) => {
	const queryClient = useQueryClient();
	const [_, copyToClipboard] = useCopyToClipboard();
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const onCopy = async () => {
		await copyToClipboard(apiKey);
		toast.success(t`Your API key has been copied to the clipboard.`);
	};

	const onConfirm = () => {
		closeDialog();
		void queryClient.invalidateQueries({ queryKey: ["auth", "api-keys"] });
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<CopyIcon />
					<Trans>Here's your new API key</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Copy this secret key and use it in your applications to access your data.</Trans>
				</DialogDescription>
			</DialogHeader>

			<div className="space-y-2 py-2">
				<InputGroup>
					<InputGroupInput value={apiKey} readOnly />
					<InputGroupAddon align="inline-end">
						<InputGroupButton size="icon-sm" onClick={onCopy}>
							<CopyIcon />
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>

				<span className="font-medium text-muted-foreground text-sm">
					<Trans>For security reasons, this key will only be displayed once.</Trans>
				</span>
			</div>

			<DialogFooter>
				<Button onClick={onConfirm}>
					<Trans comment="Create API key dialog acknowledgment action after copying">Confirm</Trans>
				</Button>
			</DialogFooter>
		</DialogContent>
	);
};
