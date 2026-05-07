import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CheckIcon, UserCircleIcon, WarningIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { match } from "ts-pattern";
import z from "zod";
import { Button } from "@reactive-resume/ui/components/button";
import { FormControl, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import { Separator } from "@reactive-resume/ui/components/separator";
import { authClient } from "@/libs/auth/client";
import { getReadableErrorMessage } from "@/libs/error-message";
import { useAppForm } from "@/libs/tanstack-form";
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

function RouteComponent() {
	const router = useRouter();
	const { session } = Route.useRouteContext();

	const form = useAppForm({
		defaultValues: {
			name: session.user.name,
			username: session.user.username,
			email: session.user.email,
		},
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			const { error } = await authClient.updateUser({
				name: value.name,
				username: value.username,
				displayUsername: value.username,
			});

			if (error) {
				toast.error(
					getReadableErrorMessage(
						error,
						t({
							comment: "Fallback toast when updating profile details fails",
							message: "Failed to update your profile. Please try again.",
						}),
					),
				);
				return;
			}

			toast.success(t`Your profile has been updated successfully.`);
			form.reset({ name: value.name, username: value.username, email: session.user.email });
			void router.invalidate();

			if (value.email !== session.user.email) {
				const { error } = await authClient.changeEmail({
					newEmail: value.email,
					callbackURL: "/dashboard/settings/profile",
				});

				if (error) {
					toast.error(
						getReadableErrorMessage(
							error,
							t({
								comment: "Fallback toast when requesting email change confirmation fails",
								message: "Failed to request email change. Please try again.",
							}),
						),
					);
					return;
				}

				toast.success(
					t`A confirmation link has been sent to your current email address. Please check your inbox to confirm the change.`,
				);
				form.reset({ name: value.name, username: value.username, email: session.user.email });
				void router.invalidate();
			}
		},
	});

	const onCancel = () => {
		form.reset();
	};

	const isDirty = useStore(form.store, (s) => s.isDirty);

	const handleResendVerificationEmail = async () => {
		const toastId = toast.loading(t`Resending verification email...`);

		const { error } = await authClient.sendVerificationEmail({
			email: session.user.email,
			callbackURL: "/dashboard/settings/profile",
		});

		if (error) {
			toast.error(
				getReadableErrorMessage(
					error,
					t({
						comment: "Fallback toast when resending account verification email fails",
						message: "Failed to resend verification email. Please try again.",
					}),
				),
				{ id: toastId },
			);
			return;
		}

		toast.success(
			t`A new verification link has been sent to your email address. Please check your inbox to verify your account.`,
			{ id: toastId },
		);
		void router.invalidate();
	};

	return (
		<div className="space-y-4">
			<DashboardHeader icon={UserCircleIcon} title={t`Profile`} />

			<Separator />

			<motion.form
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.25, ease: "easeOut" }}
				className="grid max-w-xl gap-6 will-change-[transform,opacity]"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<form.Field name="name">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Name</Trans>
							</FormLabel>
							<FormControl
								render={
									<Input
										min={3}
										max={64}
										autoComplete="name"
										placeholder={t({
											comment: "Example full name placeholder on profile settings form",
											message: "John Doe",
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

				<form.Field name="username">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Username</Trans>
							</FormLabel>
							<FormControl
								render={
									<Input
										min={3}
										max={64}
										autoComplete="username"
										placeholder={t({
											comment: "Example username placeholder on profile settings form",
											message: "john.doe",
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
						</FormItem>
					)}
				</form.Field>

				<form.Field name="email">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Email Address</Trans>
							</FormLabel>
							<FormControl
								render={
									<Input
										type="email"
										autoComplete="email"
										placeholder={t({
											comment: "Example email placeholder on profile settings form",
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
				</form.Field>

				<AnimatePresence initial={false} mode="popLayout">
					{isDirty && (
						<motion.div
							initial={{ opacity: 0, y: -8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.16, ease: "easeOut" }}
							className="flex items-center gap-x-4 justify-self-end will-change-[transform,opacity]"
						>
							<Button type="reset" variant="ghost" onClick={onCancel}>
								<Trans comment="Profile settings form action to discard unsaved edits">Cancel</Trans>
							</Button>

							<Button type="submit">
								<Trans>Save Changes</Trans>
							</Button>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.form>
		</div>
	);
}
