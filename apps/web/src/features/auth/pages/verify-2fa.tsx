import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowLeftIcon, CheckIcon } from "@phosphor-icons/react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import z from "zod";
import { Button } from "@reactive-resume/ui/components/button";
import { FormControl, FormItem, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import { toast } from "@reactive-resume/ui/components/toast";
import { authClient } from "@/libs/auth/client";
import { useAppForm } from "@/libs/tanstack-form";

const totpSchema = z.object({
	code: z.string().length(6, "Code must be 6 digits"),
});

const backupCodeSchema = z.object({
	code: z.string().trim(),
});

type TwoFactorVerificationPageProps = {
	backupCode?: boolean;
};

function TwoFactorVerificationPage({ backupCode = false }: TwoFactorVerificationPageProps) {
	const router = useRouter();
	const navigate = useNavigate();

	const form = useAppForm({
		defaultValues: { code: "" },
		validators: { onSubmit: backupCode ? backupCodeSchema : totpSchema },
		onSubmit: async ({ value }) => {
			const toastId = toast.add({
				type: "loading",
				description: backupCode ? t`Verifying backup code...` : t`Verifying code...`,
			});
			const code = backupCode ? `${value.code.slice(0, 5)}-${value.code.slice(5)}` : value.code;
			const { error } = backupCode
				? await authClient.twoFactor.verifyBackupCode({ code })
				: await authClient.twoFactor.verifyTotp({ code });

			if (error) {
				toast.add({
					type: "error",
					description:
						error.message ||
						(backupCode
							? t({
									comment: "Fallback toast when verifying a backup two-factor authentication code fails",
									message: "Failed to verify your backup code. Please try again.",
								})
							: t({
									comment: "Fallback toast when verifying a two-factor authentication code fails",
									message: "Failed to verify your code. Please try again.",
								})),
					id: toastId,
				});
				return;
			}

			toast.close(toastId);
			await router.invalidate();
			void navigate({ to: "/dashboard", replace: true });
		},
	});

	return (
		<>
			<div className="space-y-1 text-center">
				<h1 className="font-semibold text-2xl tracking-tight">
					{backupCode ? <Trans>Verify with a Backup Code</Trans> : <Trans>Two-Factor Authentication</Trans>}
				</h1>
				<div className="text-muted-foreground">
					{backupCode ? (
						<Trans>Enter one of your saved backup codes to access your account</Trans>
					) : (
						<Trans>Enter the verification code from your authenticator app</Trans>
					)}
				</div>
			</div>

			<form
				className="grid gap-6"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<form.Field name="code">
					{(field) => (
						<FormItem
							className="justify-self-center"
							hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
						>
							<FormControl
								render={
									<Input
										type={backupCode ? "text" : "number"}
										maxLength={backupCode ? 10 : 6}
										className="max-w-xs"
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

				<div className="flex gap-x-2">
					<Button
						variant="outline"
						className="flex-1"
						nativeButton={false}
						render={
							<Link to={backupCode ? "/auth/verify-2fa" : "/auth/login"}>
								<ArrowLeftIcon />
								{backupCode ? (
									<Trans comment="Secondary navigation button on backup-code verification screen">Go Back</Trans>
								) : (
									<Trans comment="Secondary navigation button on 2FA verification screen">Back to sign in</Trans>
								)}
							</Link>
						}
					/>

					<Button type="submit" className="flex-1">
						<CheckIcon />
						{backupCode ? (
							<Trans comment="Primary action button to submit backup code">Verify</Trans>
						) : (
							<Trans comment="Primary action button to submit 2FA code">Verify</Trans>
						)}
					</Button>
				</div>
			</form>

			{!backupCode && (
				<Button
					variant="link"
					nativeButton={false}
					className="h-auto justify-self-center p-0 text-sm"
					render={
						<Link to="/auth/verify-2fa-backup">
							<Trans comment="Link to backup-code verification flow when authenticator app is unavailable">
								Lost access to your authenticator?
							</Trans>
						</Link>
					}
				/>
			)}
		</>
	);
}

export function VerifyTwoFactorPage() {
	return <TwoFactorVerificationPage />;
}

export function VerifyTwoFactorBackupPage() {
	return <TwoFactorVerificationPage backupCode />;
}
