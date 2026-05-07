import type { DialogProps } from "../store";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { EyeIcon, EyeSlashIcon, PasswordIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useToggle } from "usehooks-ts";
import z from "zod";
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
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { authClient } from "@/libs/auth/client";
import { getReadableErrorMessage } from "@/libs/error-message";
import { useAppForm } from "@/libs/tanstack-form";
import { useDialogStore } from "../store";

const formSchema = z
	.object({
		currentPassword: z.string().min(6).max(64),
		newPassword: z.string().min(6).max(64),
	})
	.refine((data) => data.newPassword !== data.currentPassword, {
		message: "New password cannot be the same as the current password.",
		path: ["newPassword"],
	});

export function ChangePasswordDialog(_: DialogProps<"auth.change-password">) {
	const queryClient = useQueryClient();
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const [showCurrentPassword, toggleShowCurrentPassword] = useToggle(false);
	const [showNewPassword, toggleShowNewPassword] = useToggle(false);

	const form = useAppForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const toastId = toast.loading(t`Updating your password...`);

			const { error } = await authClient.changePassword({
				currentPassword: value.currentPassword,
				newPassword: value.newPassword,
			});

			if (error) {
				toast.error(
					getReadableErrorMessage(
						error,
						t({
							comment: "Fallback toast when changing account password fails",
							message: "Failed to update your password. Please try again.",
						}),
					),
					{ id: toastId },
				);
				return;
			}

			toast.success(t`Your password has been updated successfully.`, { id: toastId });
			void queryClient.invalidateQueries({ queryKey: ["auth", "accounts"] });
			closeDialog();
		},
	});

	useFormBlocker(form);

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PasswordIcon />
					<Trans>Update your password</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Enter your current password and a new password to update your account.</Trans>
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
				<form.Field name="currentPassword">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Current Password</Trans>
							</FormLabel>
							<div className="flex items-center gap-x-1.5">
								<FormControl
									render={
										<Input
											min={6}
											max={64}
											type={showCurrentPassword ? "text" : "password"}
											autoComplete="current-password"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
									}
								/>

								<Button size="icon" variant="ghost" type="button" onClick={toggleShowCurrentPassword}>
									<span className="sr-only">
										{showCurrentPassword
											? t({
													comment: "Accessible label for toggle button that hides the visible current password",
													message: "Hide password",
												})
											: t({
													comment: "Accessible label for toggle button that reveals the masked current password",
													message: "Show password",
												})}
									</span>
									{showCurrentPassword ? <EyeIcon /> : <EyeSlashIcon />}
								</Button>
							</div>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<form.Field name="newPassword">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>New Password</Trans>
							</FormLabel>
							<div className="flex items-center gap-x-1.5">
								<FormControl
									render={
										<Input
											min={6}
											max={64}
											type={showNewPassword ? "text" : "password"}
											autoComplete="new-password"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
									}
								/>

								<Button size="icon" variant="ghost" type="button" onClick={toggleShowNewPassword}>
									<span className="sr-only">
										{showNewPassword
											? t({
													comment: "Accessible label for toggle button that hides the visible new password",
													message: "Hide password",
												})
											: t({
													comment: "Accessible label for toggle button that reveals the masked new password",
													message: "Show password",
												})}
									</span>
									{showNewPassword ? <EyeIcon /> : <EyeSlashIcon />}
								</Button>
							</div>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<DialogFooter>
					<Button type="submit">
						<Trans comment="Primary action button to submit changed password">Update Password</Trans>
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
