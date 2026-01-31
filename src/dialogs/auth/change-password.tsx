import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { EyeIcon, EyeSlashIcon, PasswordIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useToggle } from "usehooks-ts";
import z from "zod";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { authClient } from "@/integrations/auth/client";
import { type DialogProps, useDialogStore } from "../store";

const formSchema = z
	.object({
		currentPassword: z.string().min(6).max(64),
		newPassword: z.string().min(6).max(64),
	})
	.refine((data) => data.newPassword !== data.currentPassword, {
		message: "New password cannot be the same as the current password.",
		path: ["newPassword"],
	});

type FormValues = z.infer<typeof formSchema>;

export function ChangePasswordDialog(_: DialogProps<"auth.change-password">) {
	const queryClient = useQueryClient();
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const [showCurrentPassword, toggleShowCurrentPassword] = useToggle(false);
	const [showNewPassword, toggleShowNewPassword] = useToggle(false);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			currentPassword: "",
			newPassword: "",
		},
	});

	const { blockEvents } = useFormBlocker(form);

	const onSubmit = async (data: FormValues) => {
		const toastId = toast.loading(t`Updating your password...`);

		const { error } = await authClient.changePassword({
			currentPassword: data.currentPassword,
			newPassword: data.newPassword,
		});

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.success(t`Your password has been updated successfully.`, { id: toastId });
		queryClient.invalidateQueries({ queryKey: ["auth", "accounts"] });
		closeDialog();
	};

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PasswordIcon />
					<Trans>Update your password</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Enter your current password and a new password to update your account.</Trans>
				</DialogDescription>
			</DialogHeader>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<FormField
						control={form.control}
						name="currentPassword"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<Trans>Current Password</Trans>
								</FormLabel>
								<div className="flex items-center gap-x-1.5">
									<FormControl>
										<Input
											min={6}
											max={64}
											type={showCurrentPassword ? "text" : "password"}
											autoComplete="current-password"
											{...field}
										/>
									</FormControl>

									<Button size="icon" variant="ghost" type="button" onClick={toggleShowCurrentPassword}>
										{showCurrentPassword ? <EyeIcon /> : <EyeSlashIcon />}
									</Button>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="newPassword"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<Trans>New Password</Trans>
								</FormLabel>
								<div className="flex items-center gap-x-1.5">
									<FormControl>
										<Input
											min={6}
											max={64}
											type={showNewPassword ? "text" : "password"}
											autoComplete="new-password"
											{...field}
										/>
									</FormControl>

									<Button size="icon" variant="ghost" type="button" onClick={toggleShowNewPassword}>
										{showNewPassword ? <EyeIcon /> : <EyeSlashIcon />}
									</Button>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>

					<DialogFooter>
						<Button type="submit">
							<Trans>Update Password</Trans>
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}
