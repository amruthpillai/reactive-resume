import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useToggle } from "usehooks-ts";
import z from "zod";
import { Button } from "@reactive-resume/ui/components/button";
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import { authClient } from "@/libs/auth/client";
import { orpc } from "@/libs/orpc/client";
import { useAppForm } from "@/libs/tanstack-form";
import { SocialAuth } from "./-components/social-auth";

export const Route = createFileRoute("/auth/login")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		if (context.session) throw redirect({ to: "/dashboard", replace: true });
		return { session: null };
	},
});

const formSchema = z.object({
	identifier: z.string().trim().toLowerCase(),
	password: z.string().trim().min(6).max(64),
});

function RouteComponent() {
	const router = useRouter();
	const navigate = useNavigate();
	const { flags } = Route.useRouteContext();

	const hasStartedConditionalPasskeyRef = useRef(false);
	const [showPassword, toggleShowPassword] = useToggle(false);

	const { data: providers = {} } = useQuery(orpc.auth.providers.list.queryOptions());

	const form = useAppForm({
		defaultValues: { identifier: "", password: "" },
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			const toastId = toast.loading(t`Signing in...`);

			try {
				const isEmail = value.identifier.includes("@");

				const result = isEmail
					? await authClient.signIn.email({ email: value.identifier, password: value.password })
					: await authClient.signIn.username({ username: value.identifier, password: value.password });

				if (result.error) {
					toast.error(
						result.error.message ||
							t({
								comment: "Fallback toast when sign-in fails and no server error message is available",
								message: "Failed to sign in. Please try again.",
							}),
						{ id: toastId },
					);
					return;
				}

				const requiresTwoFactor =
					result.data &&
					typeof result.data === "object" &&
					"twoFactorRedirect" in result.data &&
					result.data.twoFactorRedirect;

				if (requiresTwoFactor) {
					toast.dismiss(toastId);
					void navigate({ to: "/auth/verify-2fa", replace: true });
					return;
				}

				toast.dismiss(toastId);
				await router.invalidate();
				void navigate({ to: "/dashboard", replace: true });
			} catch {
				toast.error(t`Failed to sign in. Please try again.`, { id: toastId });
			}
		},
	});

	useEffect(() => {
		if (!("passkey" in providers)) return;
		if (typeof window === "undefined") return;
		if (!("PublicKeyCredential" in window)) return;
		if (!PublicKeyCredential.isConditionalMediationAvailable) return;
		if (hasStartedConditionalPasskeyRef.current) return;

		hasStartedConditionalPasskeyRef.current = true;

		void PublicKeyCredential.isConditionalMediationAvailable().then(async (isAvailable) => {
			if (!isAvailable) return;

			const { error } = await authClient.signIn.passkey({ autoFill: true });
			if (error) return;

			await router.invalidate();
		});
	}, [providers, router]);

	return (
		<>
			<div className="space-y-1 text-center">
				<h1 className="font-bold text-2xl tracking-tight">
					<Trans comment="Title on the login page">Sign in to your account</Trans>
				</h1>

				{!flags.disableSignups && (
					<div className="text-muted-foreground">
						<Trans>
							Don't have an account?{" "}
							<Button
								variant="link"
								nativeButton={false}
								className="h-auto gap-1.5 px-1! py-0"
								render={
									<Link to="/auth/register">
										<Trans comment="Call-to-action link from login page to account registration page">
											Create one now
										</Trans>{" "}
										<ArrowRightIcon />
									</Link>
								}
							/>
						</Trans>
					</div>
				)}
			</div>

			{!flags.disableEmailAuth && (
				<form
					className="space-y-6"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
				>
					<form.Field name="identifier">
						{(field) => (
							<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
								<FormLabel>
									<Trans comment="Label for login identifier input that accepts email or username">Email Address</Trans>
								</FormLabel>
								<FormControl
									render={
										<Input
											autoComplete="section-login username webauthn"
											placeholder={t({
												comment: "Example email placeholder for login identifier field",
												message: "john.doe@example.com",
											})}
											className="lowercase"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
									}
								/>
								<FormMessage errors={field.state.meta.errors} />
								<FormDescription>
									<Trans>You can also use your username to login.</Trans>
								</FormDescription>
							</FormItem>
						)}
					</form.Field>

					<form.Field name="password">
						{(field) => (
							<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
								<div className="flex items-center justify-between">
									<FormLabel>
										<Trans comment="Label for password input on login form">Password</Trans>
									</FormLabel>

									<Button
										tabIndex={-1}
										variant="link"
										nativeButton={false}
										className="h-auto p-0 text-xs leading-none"
										render={
											<Link to="/auth/forgot-password">
												<Trans comment="Link label to password reset page from login form">Forgot Password?</Trans>
											</Link>
										}
									/>
								</div>
								<div className="flex items-center gap-x-1.5">
									<FormControl
										render={
											<Input
												min={6}
												max={64}
												type={showPassword ? "text" : "password"}
												autoComplete="section-login current-password"
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
														comment: "Accessible label for button that hides the password in login form",
														message: "Hide password",
													})
												: t({
														comment: "Accessible label for button that reveals the password in login form",
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
						<Trans comment="Primary action button label on login form">Sign in</Trans>
					</Button>
				</form>
			)}

			<SocialAuth />
		</>
	);
}
