import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useToggle } from "usehooks-ts";
import z from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/integrations/auth/client";
import { SocialAuth } from "./-components/social-auth";

export const Route = createFileRoute("/auth/register")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		if (context.session) throw redirect({ to: "/dashboard", replace: true });
		if (context.flags.disableSignups) throw redirect({ to: "/auth/login", replace: true });
		return { session: null };
	},
});

const formSchema = z.object({
	name: z.string().min(3).max(64),
	username: z
		.string()
		.min(3)
		.max(64)
		.trim()
		.toLowerCase()
		.regex(/^[a-z0-9._-]+$/, {
			message: "Username can only contain lowercase letters, numbers, dots, hyphens and underscores.",
		}),
	email: z.email().toLowerCase(),
	password: z.string().min(6).max(64),
});

type FormValues = z.infer<typeof formSchema>;

function RouteComponent() {
	const [submitted, setSubmitted] = useState(false);
	const [showPassword, toggleShowPassword] = useToggle(false);
	const { flags } = Route.useRouteContext();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			username: "",
			email: "",
			password: "",
		},
	});

	const onSubmit = async (data: FormValues) => {
		const toastId = toast.loading(t`Signing up...`);

		const { error } = await authClient.signUp.email({
			name: data.name,
			email: data.email,
			password: data.password,
			username: data.username,
			displayUsername: data.username,
			callbackURL: "/dashboard",
		});

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		setSubmitted(true);
		toast.dismiss(toastId);
	};

	if (submitted) return <PostSignupScreen />;

	return (
		<>
			<div className="space-y-1 text-center">
				<h1 className="font-bold text-2xl tracking-tight">
					<Trans>Create a new account</Trans>
				</h1>

				<div className="text-muted-foreground">
					<Trans>
						Already have an account?{" "}
						<Button asChild variant="link" className="h-auto gap-1.5 px-1! py-0">
							<Link to="/auth/login">
								Sign in now <ArrowRightIcon />
							</Link>
						</Button>
					</Trans>
				</div>
			</div>

			{!flags.disableEmailAuth && (
				<Form {...form}>
					<form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										<Trans>Name</Trans>
									</FormLabel>
									<FormControl>
										<Input min={3} max={64} autoComplete="name" placeholder="John Doe" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="username"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										<Trans>Username</Trans>
									</FormLabel>
									<FormControl>
										<Input
											min={3}
											max={64}
											autoComplete="username"
											placeholder="john.doe"
											className="lowercase"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										<Trans>Email Address</Trans>
									</FormLabel>
									<FormControl>
										<Input
											type="email"
											autoComplete="email"
											placeholder="john.doe@example.com"
											className="lowercase"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										<Trans>Password</Trans>
									</FormLabel>
									<div className="flex items-center gap-x-1.5">
										<FormControl>
											<Input
												min={6}
												max={64}
												type={showPassword ? "text" : "password"}
												autoComplete="new-password"
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
							<Trans>Sign up</Trans>
						</Button>
					</form>
				</Form>
			)}

			<SocialAuth />
		</>
	);
}

function PostSignupScreen() {
	return (
		<>
			<div className="space-y-1 text-center">
				<h1 className="font-bold text-2xl tracking-tight">
					<Trans>You've got mail!</Trans>
				</h1>
				<p className="text-muted-foreground">
					<Trans>Check your email for a link to verify your account.</Trans>
				</p>
			</div>

			<Alert>
				<AlertTitle>
					<Trans>This step is optional, but recommended.</Trans>
				</AlertTitle>
				<AlertDescription>
					<Trans>Verifying your email is required when resetting your password.</Trans>
				</AlertDescription>
			</Alert>

			<Button asChild>
				<Link to="/dashboard">
					<Trans>Continue</Trans> <ArrowRightIcon />
				</Link>
			</Button>
		</>
	);
}
