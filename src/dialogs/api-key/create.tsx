import { zodResolver } from "@hookform/resolvers/zod";
import { CopyIcon, PlusIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import z from "zod";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { authClient } from "@/integrations/auth/client";
import { type DialogProps, useDialogStore } from "../store";

const formSchema = z.object({
	name: z.string().min(1).max(64),
	expiresIn: z.number().min(1),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateApiKeyDialog(_: DialogProps<"api-key.create">) {
	const [apiKey, setApiKey] = useState<string | null>(null);

	if (apiKey) return <CopyApiKeyForm apiKey={apiKey} />;

	return <CreateApiKeyForm setApiKey={setApiKey} />;
}

type CreateApiKeyFormProps = {
	setApiKey: (apiKey: string) => void;
};

const CreateApiKeyForm = ({ setApiKey }: CreateApiKeyFormProps) => {
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			expiresIn: 3600 * 24 * 30,
		},
	});

	const { blockEvents } = useFormBlocker(form);

	const onSubmit = async (values: FormValues) => {
		const toastId = toast.loading("Creating your API key...");

		const { data, error } = await authClient.apiKey.create({
			name: values.name,
			expiresIn: values.expiresIn,
		});

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		setApiKey(data.key);
		toast.dismiss(toastId);
	};

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PlusIcon />
					Create a new API key
				</DialogTitle>
				<DialogDescription>
					This will generate a new API key to access the Reactive Resume API to allow machines to interact with your
						resume data.
				</DialogDescription>
			</DialogHeader>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									Name
								</FormLabel>
								<FormControl>
									<Input min={1} max={64} {...field} />
								</FormControl>
								<FormMessage />
								<FormDescription>
									Tip: Give your API key a name, corresponding to the purpose of the key, to help you identify it
										later.
								</FormDescription>
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="expiresIn"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									Expires in
								</FormLabel>
								<FormControl>
									<Combobox
										value={field.value}
										onValueChange={(value) => value && field.onChange(Number(value))}
										options={[
											{
												// 1 month = 30 days
												value: 3600 * 24 * 30,
												label: "1 month",
											},
											{
												// 3 months = 90 days
												value: 3600 * 24 * 90,
												label: "3 months",
											},
											{
												// 6 months = 180 days
												value: 3600 * 24 * 180,
												label: "6 months",
											},
											{
												// 1 year = 365 days
												value: 3600 * 24 * 365,
												label: "1 year",
											},
										]}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<DialogFooter>
						<Button type="submit">
							Create
						</Button>
					</DialogFooter>
				</form>
			</Form>
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

	const onCopy = () => {
		copyToClipboard(apiKey);
		toast.success("Your API key has been copied to the clipboard.");
	};

	const onConfirm = () => {
		closeDialog();
		queryClient.invalidateQueries({ queryKey: ["auth", "api-keys"] });
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<CopyIcon />
					Here's your new API key
				</DialogTitle>
				<DialogDescription>
					Copy this secret key and use it in your applications to access your data.
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
					For security reasons, this key will only be displayed once.
				</span>
			</div>

			<DialogFooter>
				<Button onClick={onConfirm}>
					Confirm
				</Button>
			</DialogFooter>
		</DialogContent>
	);
};
