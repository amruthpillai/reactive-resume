import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import type { BetterFetchOption } from "better-auth/client";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useToggle } from "usehooks-ts";
import z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/integrations/auth/client";
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

type FormValues = z.infer<typeof formSchema>;

function RouteComponent() {
	const router = useRouter();
	const navigate = useNavigate();
	const [showPassword, toggleShowPassword] = useToggle(false);
	const { flags } = Route.useRouteContext();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			identifier: "",
			password: "",
		},
	});

	const onSubmit = async (data: FormValues) => {
		const toastId = toast.loading(t`Signing in...`);

		const fetchOptions: BetterFetchOption = {
			onSuccess: (context) => {
				// Check if 2FA is required
				if (context.data && "twoFactorRedirect" in context.data && context.data.twoFactorRedirect) {
					toast.dismiss(toastId);
					navigate({ to: "/auth/verify-2fa", replace: true });
					return;
				}

				// Normal login success
				router.invalidate();
				toast.dismiss(toastId);
				navigate({ to: "/dashboard", replace: true });
			},
			onError: ({ error }) => {
				toast.error(error.message, { id: toastId });
			},
		};

		if (data.identifier.includes("@")) {
			await authClient.signIn.email({
				email: data.identifier,
				password: data.password,
				fetchOptions,
			});
		} else {
			await authClient.signIn.username({
				username: data.identifier,
				password: data.password,
				fetchOptions,
			});
		}
	};

	return (
		<>
			<div className="space-y-1 text-center">
				<h1 className="font-bold text-2xl tracking-tight">
					<Trans>Sign in to your account</Trans>
				</h1>

				{!flags.disableSignups && (
					<div className="text-muted-foreground">
						<Trans>
							Don't have an account?{" "}
							<Button asChild variant="link" className="h-auto gap-1.5 px-1! py-0">
								<Link to="/auth/register">
									Create one now <ArrowRightIcon />
								</Link>
							</Button>
						</Trans>
					</div>
				)}
			</div>

			{!flags.disableEmailAuth && (
				<Form {...form}>
					<form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
						<FormField
							control={form.control}
							name="identifier"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										<Trans>Email Address</Trans>
									</FormLabel>
									<FormControl>
										<Input autoComplete="email" placeholder="john.doe@example.com" className="lowercase" {...field} />
									</FormControl>
									<FormMessage />
									<FormDescription>
										<Trans>You can also use your username to login.</Trans>
									</FormDescription>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<div className="flex items-center justify-between">
										<FormLabel>
											<Trans>Password</Trans>
										</FormLabel>

										<Button asChild tabIndex={-1} variant="link" className="h-auto p-0 text-xs leading-none">
											<Link to="/auth/forgot-password">
												<Trans>Forgot Password?</Trans>
											</Link>
										</Button>
									</div>
									<div className="flex items-center gap-x-1.5">
										<FormControl>
											<Input
												min={6}
												max={64}
												type={showPassword ? "text" : "password"}
												autoComplete="current-password"
												{...field}
											/>
										</FormControl>

										<Button size="icon" variant="ghost" onClick={toggleShowPassword}>
											{showPassword ? <EyeIcon /> : <EyeSlashIcon />}
										</Button>
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type="submit" className="w-full">
							<Trans>Sign in</Trans>
						</Button>
					</form>
				</Form>
			)}

			<SocialAuth />
		</>
	);
}
