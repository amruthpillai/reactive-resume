import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@reactive-resume/ui/components/button";
import { FormControl, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import { authClient } from "@/libs/auth/client";
import { useAppForm } from "@/libs/tanstack-form";

export const Route = createFileRoute("/auth/forgot-password")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		if (context.flags.disableEmailAuth) throw redirect({ to: "/auth/login", replace: true });
	},
});

const formSchema = z.object({
	email: z.email(),
});

function RouteComponent() {
	const [submitted, setSubmitted] = useState(false);

	const form = useAppForm({
		defaultValues: { email: "" },
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			const toastId = toast.loading(t`Sending password reset email...`);

			const { error } = await authClient.requestPasswordReset({
				email: value.email,
				redirectTo: "/auth/reset-password",
			});

			if (error) {
				toast.error(
					error.message ||
						t({
							comment: "Fallback toast when requesting password reset email fails without backend message",
							message: "Failed to send password reset email. Please try again.",
						}),
					{ id: toastId },
				);
				return;
			}

			setSubmitted(true);
			toast.dismiss(toastId);
		},
	});

	if (submitted) return <PostForgotPasswordScreen />;

	return (
		<>
			<div className="space-y-1 text-center">
				<h1 className="font-bold text-2xl tracking-tight">
					<Trans>Forgot your password?</Trans>
				</h1>

				<div className="text-muted-foreground">
					<Trans>
						Remember your password?{" "}
						<Button
							variant="link"
							className="h-auto gap-1.5 px-1! py-0"
							nativeButton={false}
							render={
								<Link to="/auth/login">
									<Trans comment="Call-to-action link from forgot-password page to login page">Sign in now</Trans>{" "}
									<ArrowRightIcon />
								</Link>
							}
						/>
					</Trans>
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
				<form.Field name="email">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans comment="Label for email input on forgot-password form">Email Address</Trans>
							</FormLabel>
							<FormControl
								render={
									<Input
										type="email"
										autoComplete="email"
										placeholder={t({
											comment: "Example email placeholder on forgot-password form",
											message: "john.doe@example.com",
										})}
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

				<Button type="submit" className="w-full">
					<Trans comment="Primary action button label on forgot-password form">Send Password Reset Email</Trans>
				</Button>
			</form>
		</>
	);
}

function PostForgotPasswordScreen() {
	return (
		<>
			<div className="space-y-1 text-center">
				<h1 className="font-bold text-2xl tracking-tight">
					<Trans>You've got mail!</Trans>
				</h1>
				<p className="text-muted-foreground">
					<Trans>Check your email for a link to reset your password.</Trans>
				</p>
			</div>

			<Button
				nativeButton={false}
				render={
					<a href="mailto:">
						<Trans comment="Button label to open the user's default email app">Open Email Client</Trans>
					</a>
				}
			/>
		</>
	);
}
