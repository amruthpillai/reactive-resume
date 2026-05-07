import type { DialogProps } from "../store";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { EyeIcon, EyeSlashIcon, LockOpenIcon } from "@phosphor-icons/react";
import { useRouter } from "@tanstack/react-router";
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

const formSchema = z.object({
	password: z.string().min(6).max(64),
});

export function DisableTwoFactorDialog(_: DialogProps<"auth.two-factor.disable">) {
	const router = useRouter();
	const [showPassword, toggleShowPassword] = useToggle(false);
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const form = useAppForm({
		defaultValues: { password: "" },
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			const toastId = toast.loading(t`Disabling two-factor authentication...`);

			const { error } = await authClient.twoFactor.disable({ password: value.password });

			if (error) {
				toast.error(
					getReadableErrorMessage(
						error,
						t({
							comment: "Fallback toast when disabling two-factor authentication fails",
							message: "Failed to disable two-factor authentication. Please try again.",
						}),
					),
					{ id: toastId },
				);
				return;
			}

			toast.success(t`Two-factor authentication has been disabled successfully.`, { id: toastId });
			void router.invalidate();
			closeDialog();
			form.reset();
		},
	});

	useFormBlocker(form);

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<LockOpenIcon />
					<Trans>Disable Two-Factor Authentication</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>
						Enter your password to disable two-factor authentication. Your account will be less secure without 2FA
						enabled.
					</Trans>
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
				<form.Field name="password">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Password</Trans>
							</FormLabel>
							<div className="flex items-center gap-x-1.5">
								<FormControl
									render={
										<Input
											min={6}
											max={64}
											type={showPassword ? "text" : "password"}
											autoComplete="current-password"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
									}
								/>

								<Button size="icon" variant="ghost" type="button" onClick={toggleShowPassword}>
									<span className="sr-only">
										{showPassword
											? t({
													comment:
														"Accessible label for toggle button that hides the visible password in two-factor disable dialog",
													message: "Hide password",
												})
											: t({
													comment:
														"Accessible label for toggle button that reveals the masked password in two-factor disable dialog",
													message: "Show password",
												})}
									</span>
									{showPassword ? <EyeIcon /> : <EyeSlashIcon />}
								</Button>
							</div>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<DialogFooter>
					<Button type="submit" variant="destructive">
						<Trans comment="Destructive action button to turn off two-factor authentication">Disable 2FA</Trans>
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
