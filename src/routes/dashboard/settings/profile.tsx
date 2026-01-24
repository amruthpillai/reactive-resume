import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CheckIcon, UserCircleIcon, WarningIcon } from "@phosphor-icons/react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { match } from "ts-pattern";
import z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/integrations/auth/client";
import { DashboardHeader } from "../-components/header";

export const Route = createFileRoute("/dashboard/settings/profile")({
	component: RouteComponent,
});

const formSchema = z.object({
	name: z.string().trim().min(1).max(64),
	username: z
		.string()
		.trim()
		.min(1)
		.max(64)
		.regex(/^[a-z0-9._-]+$/, {
			message: "Username can only contain lowercase letters, numbers, dots, hyphens and underscores.",
		}),
	email: z.email().trim(),
});

type FormValues = z.infer<typeof formSchema>;

function RouteComponent() {
	const router = useRouter();
	const { session } = Route.useRouteContext();

	const defaultValues = useMemo(() => {
		return {
			name: session.user.name,
			username: session.user.username,
			email: session.user.email,
		};
	}, [session.user]);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues,
	});

	const onCancel = () => {
		form.reset(defaultValues);
	};

	const onSubmit = async (data: FormValues) => {
		const { error } = await authClient.updateUser({
			name: data.name,
			username: data.username,
			displayUsername: data.username,
		});

		if (error) {
			toast.error(error.message);
			return;
		}

		toast.success(t`Your profile has been updated successfully.`);
		form.reset({ name: data.name, username: data.username, email: session.user.email });
		router.invalidate();

		if (data.email !== session.user.email) {
			const { error } = await authClient.changeEmail({
				newEmail: data.email,
				callbackURL: "/dashboard/settings/profile",
			});

			if (error) {
				toast.error(error.message);
				return;
			}

			toast.success(
				t`A confirmation link has been sent to your current email address. Please check your inbox to confirm the change.`,
			);
			form.reset({ name: data.name, username: data.username, email: session.user.email });
			router.invalidate();
		}
	};

	const handleResendVerificationEmail = async () => {
		const toastId = toast.loading(t`Resending verification email...`);

		const { error } = await authClient.sendVerificationEmail({
			email: session.user.email,
			callbackURL: "/dashboard/settings/profile",
		});

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.success(
			t`A new verification link has been sent to your email address. Please check your inbox to verify your account.`,
			{ id: toastId },
		);
		router.invalidate();
	};

	return (
		<div className="space-y-4">
			<DashboardHeader icon={UserCircleIcon} title={t`Profile`} />

			<Separator />

			<Form {...form}>
				<motion.form
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3 }}
					className="grid max-w-xl gap-6"
					onSubmit={form.handleSubmit(onSubmit)}
				>
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
								{match(session.user.emailVerified)
									.with(true, () => (
										<p className="flex items-center gap-x-1.5 text-green-700 text-xs">
											<CheckIcon />
											<Trans>Verified</Trans>
										</p>
									))
									.with(false, () => (
										<p className="flex items-center gap-x-1.5 text-amber-600 text-xs">
											<WarningIcon className="size-3.5" />
											<Trans>Unverified</Trans>
											<span>|</span>
											<Button
												variant="link"
												className="h-auto gap-x-1.5 p-0! text-inherit text-xs"
												onClick={handleResendVerificationEmail}
											>
												<Trans>Resend verification email</Trans>
											</Button>
										</p>
									))
									.exhaustive()}
							</FormItem>
						)}
					/>

					<AnimatePresence>
						{form.formState.isDirty && (
							<motion.div
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20 }}
								className="flex items-center gap-x-4 justify-self-end"
							>
								<Button type="reset" variant="ghost" onClick={onCancel}>
									<Trans>Cancel</Trans>
								</Button>

								<Button type="submit">
									<Trans>Save Changes</Trans>
								</Button>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.form>
			</Form>
		</div>
	);
}
