import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ORPCError } from "@orpc/client";
import { EyeIcon, EyeSlashIcon, LockOpenIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, SearchParamError, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useMemo } from "react";
import { toast } from "sonner";
import { useToggle } from "usehooks-ts";
import z from "zod";
import { Button } from "@reactive-resume/ui/components/button";
import { FormControl, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import { getReadableErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";
import { useAppForm } from "@/libs/tanstack-form";

const searchSchema = z.object({
	redirect: z
		.string()
		.min(1)
		.regex(/^\/[^/]+\/[^/]+$/),
});

export const Route = createFileRoute("/auth/resume-password")({
	component: RouteComponent,
	validateSearch: zodValidator(searchSchema),
	onError: (error) => {
		if (error instanceof SearchParamError) {
			throw redirect({ to: "/" });
		}
	},
});

const formSchema = z.object({
	password: z.string().min(6).max(64),
});

function RouteComponent() {
	const navigate = useNavigate();
	const { redirect } = Route.useSearch();
	const [showPassword, toggleShowPassword] = useToggle(false);

	const { mutate: verifyPassword } = useMutation(orpc.resume.verifyPassword.mutationOptions());

	const [username, slug] = useMemo(() => {
		const [username, slug] = redirect.split("/").slice(1) as [string, string];
		if (!username || !slug) throw navigate({ to: "/" });
		return [username, slug];
	}, [redirect, navigate]);

	const form = useAppForm({
		defaultValues: { password: "" },
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value, formApi }) => {
			const toastId = toast.loading(t`Verifying password...`);

			verifyPassword(
				{ username, slug, password: value.password },
				{
					onSuccess: () => {
						toast.dismiss(toastId);
						void navigate({ to: redirect, replace: true });
					},
					onError: (error) => {
						if (error instanceof ORPCError && error.code === "INVALID_PASSWORD") {
							toast.dismiss(toastId);
							formApi.setFieldMeta("password", (meta) => ({
								...meta,
								isTouched: true,
								errors: [{ message: t`The password you entered is incorrect` }],
								errorMap: {
									...meta.errorMap,
									onSubmit: { message: t`The password you entered is incorrect` },
								},
							}));
						} else {
							toast.error(
								getReadableErrorMessage(
									error,
									t({
										comment: "Fallback toast when resume password verification fails unexpectedly",
										message: "Failed to verify the password. Please try again.",
									}),
								),
								{ id: toastId },
							);
						}
					},
				},
			);
		},
	});

	return (
		<>
			<div className="space-y-4 text-center">
				<h1 className="font-bold text-2xl tracking-tight">
					<Trans>The resume you are trying to access is password protected</Trans>
				</h1>

				<div className="text-muted-foreground leading-relaxed">
					<Trans>Please enter the password shared with you by the owner of the resume to continue.</Trans>
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
								<Trans comment="Label for password input on protected resume access form">Password</Trans>
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
													comment: "Accessible label for button that hides password on protected resume screen",
													message: "Hide password",
												})
											: t({
													comment: "Accessible label for button that reveals password on protected resume screen",
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
					<LockOpenIcon />
					<Trans comment="Primary action button label to unlock a password-protected resume">Unlock</Trans>
				</Button>
			</form>
		</>
	);
}
