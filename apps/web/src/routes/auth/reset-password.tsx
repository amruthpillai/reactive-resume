import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { createFileRoute, redirect, SearchParamError, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { toast } from "sonner";
import { useToggle } from "usehooks-ts";
import z from "zod";
import { Button } from "@reactive-resume/ui/components/button";
import { FormControl, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import { authClient } from "@/libs/auth/client";
import { useAppForm } from "@/libs/tanstack-form";

const searchSchema = z.object({ token: z.string().min(1) });

export const Route = createFileRoute("/auth/reset-password")({
	component: RouteComponent,
	validateSearch: zodValidator(searchSchema),
	beforeLoad: async ({ context }) => {
		if (context.flags.disableEmailAuth) throw redirect({ to: "/auth/login", replace: true });
	},
	onError: (error) => {
		if (error instanceof SearchParamError) {
			throw redirect({ to: "/auth/login" });
		}
	},
});

const formSchema = z.object({
	password: z.string().min(6).max(64),
});

function RouteComponent() {
	const navigate = useNavigate();
	const { token } = Route.useSearch();
	const [showPassword, toggleShowPassword] = useToggle(false);

	const form = useAppForm({
		defaultValues: { password: "" },
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			const toastId = toast.loading(t`Resetting your password...`);

			const { error } = await authClient.resetPassword({ token, newPassword: value.password });

			if (error) {
				toast.error(
					error.message ||
						t({
							comment: "Fallback toast when resetting password fails and no backend message is available",
							message: "Failed to reset your password. Please try again.",
						}),
					{ id: toastId },
				);
				return;
			}

			toast.success(t`Your password has been reset successfully. You can now sign in with your new password.`, {
				id: toastId,
			});

			void navigate({ to: "/auth/login" });
		},
	});

	return (
		<>
			<div className="space-y-1 text-center">
				<h1 className="font-bold text-2xl tracking-tight">
					<Trans>Reset your password</Trans>
				</h1>

				<div className="text-muted-foreground">
					<Trans>Please enter a new password for your account</Trans>
				</div>
			</div>

			<form
				className="space-y-6"
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
								<Trans comment="Label for new password input on reset-password form">New Password</Trans>
							</FormLabel>
							<div className="flex items-center gap-x-1.5">
								<FormControl
									render={
										<Input
											min={6}
											max={64}
											type={showPassword ? "text" : "password"}
											autoComplete="new-password"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
									}
								/>

								<Button
									size="icon"
									variant="ghost"
									onClick={toggleShowPassword}
									aria-label={
										showPassword
											? t({
													comment: "Accessible label for button that hides password in reset-password form",
													message: "Hide password",
												})
											: t({
													comment: "Accessible label for button that reveals password in reset-password form",
													message: "Show password",
												})
									}
								>
									{showPassword ? <EyeIcon /> : <EyeSlashIcon />}
								</Button>
							</div>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<Button type="submit" className="w-full">
					<Trans comment="Primary action button label on reset-password form">Reset Password</Trans>
				</Button>
			</form>
		</>
	);
}
