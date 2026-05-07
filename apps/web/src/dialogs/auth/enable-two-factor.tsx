import type { DialogProps } from "../store";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowDownIcon, CopyIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { useRouter } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";
import { match } from "ts-pattern";
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

const enableFormSchema = z.object({
	password: z.string().min(6).max(64),
});

const verifyFormSchema = z.object({
	code: z.string().length(6, "Code must be 6 digits"),
});

export function EnableTwoFactorDialog(_: DialogProps<"auth.two-factor.enable">) {
	const router = useRouter();

	const [totpUri, setTotpUri] = useState<string | null>(null);
	const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
	const [step, setStep] = useState<"enable" | "verify" | "backup">("enable");

	const [showPassword, toggleShowPassword] = useToggle(false);
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const enableForm = useAppForm({
		defaultValues: { password: "" },
		validators: { onSubmit: enableFormSchema },
		onSubmit: async ({ value }) => {
			const toastId = toast.loading(t`Enabling two-factor authentication...`);

			const { data, error } = await authClient.twoFactor.enable({
				password: value.password,
				issuer: "Reactive Resume",
			});

			if (error) {
				toast.error(
					getReadableErrorMessage(
						error,
						t({
							comment: "Fallback toast when enabling two-factor authentication fails",
							message: "Failed to enable two-factor authentication. Please try again.",
						}),
					),
					{ id: toastId },
				);
				return;
			}

			if (data.totpURI && data.backupCodes) {
				setTotpUri(data.totpURI);
				setBackupCodes(data.backupCodes);
				setStep("verify");
				toast.dismiss(toastId);
			} else {
				toast.error(t`Failed to setup two-factor authentication.`, { id: toastId });
			}
		},
	});

	const verifyForm = useAppForm({
		defaultValues: { code: "" },
		validators: { onSubmit: verifyFormSchema },
		onSubmit: async ({ value }) => {
			const toastId = toast.loading(t`Verifying code...`);

			const { error } = await authClient.twoFactor.verifyTotp({ code: value.code });

			if (error) {
				toast.error(
					getReadableErrorMessage(
						error,
						t({
							comment: "Fallback toast when verifying two-factor setup code fails",
							message: "Failed to verify your code. Please try again.",
						}),
					),
					{ id: toastId },
				);
				return;
			}

			toast.dismiss(toastId);
			setStep("backup");
		},
	});

	const enableIsDirty = useStore(enableForm.store, (s) => s.isDirty);
	const enableIsSubmitting = useStore(enableForm.store, (s) => s.isSubmitting);
	const verifyIsDirty = useStore(verifyForm.store, (s) => s.isDirty);
	const verifyIsSubmitting = useStore(verifyForm.store, (s) => s.isSubmitting);

	const { requestClose } = useFormBlocker(enableForm, {
		shouldBlock: () => {
			if (step === "enable") return enableIsDirty && !enableIsSubmitting;
			if (step === "verify") return verifyIsDirty && !verifyIsSubmitting;
			return false;
		},
	});

	const onConfirmBackup = () => {
		toast.success(t`Two-factor authentication has been setup successfully.`);
		void router.invalidate();
		closeDialog();
		onReset();
	};

	const onReset = () => {
		enableForm.reset();
		verifyForm.reset();
		setStep("enable");
		setTotpUri(null);
		setBackupCodes(null);
	};

	const handleCopySecret = async () => {
		if (!totpUri) return;
		const secret = extractSecretFromTotpUri(totpUri);
		if (!secret) return;
		await navigator.clipboard.writeText(secret);
		toast.success(t`Secret copied to clipboard.`);
	};

	const handleCopyBackupCodes = async () => {
		if (!backupCodes) return;
		await navigator.clipboard.writeText(backupCodes.join("\n"));
		toast.success(t`Backup codes copied to clipboard.`);
	};

	const handleDownloadBackupCodes = () => {
		if (!backupCodes) return;
		const content = backupCodes.join("\n");
		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "reactive-resume_backup-codes.txt";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>
					{match(step)
						.with("enable", () => <Trans>Enable Two-Factor Authentication</Trans>)
						.with("verify", () => <Trans>Setup Authenticator App</Trans>)
						.with("backup", () => <Trans>Copy Backup Codes</Trans>)
						.exhaustive()}
				</DialogTitle>
				<DialogDescription>
					{match(step)
						.with("enable", () => (
							<Trans>
								Enter your password to confirm setting up two-factor authentication. When enabled, you'll need to enter
								a code from your authenticator app every time you log in.
							</Trans>
						))
						.with("verify", () => (
							<Trans>
								Scan the QR code below with your preferred authenticator app. You can also copy the secret below and
								paste it into your app.
							</Trans>
						))
						.with("backup", () => <Trans>Copy and store these backup codes in case you lose your device.</Trans>)
						.exhaustive()}
				</DialogDescription>
			</DialogHeader>

			{match(step)
				.with("enable", () => (
					<form
						className="space-y-4"
						onSubmit={(event) => {
							event.preventDefault();
							event.stopPropagation();
							void enableForm.handleSubmit();
						}}
					>
						<enableForm.Field name="password">
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
																"Accessible label for toggle button that hides the visible password in two-factor setup",
															message: "Hide password",
														})
													: t({
															comment:
																"Accessible label for toggle button that reveals the masked password in two-factor setup",
															message: "Show password",
														})}
											</span>
											{showPassword ? <EyeIcon /> : <EyeSlashIcon />}
										</Button>
									</div>
									<FormMessage errors={field.state.meta.errors} />
								</FormItem>
							)}
						</enableForm.Field>

						<DialogFooter>
							<Button type="submit">
								<Trans>Continue</Trans>
							</Button>
						</DialogFooter>
					</form>
				))
				.with("verify", () => {
					const secret = totpUri ? extractSecretFromTotpUri(totpUri) : null;
					return (
						<div className="space-y-4">
							{totpUri && secret && (
								<>
									<div className="flex items-center gap-x-2">
										<Input readOnly value={secret} className="font-mono text-sm" />
										<Button size="icon" variant="ghost" type="button" onClick={handleCopySecret}>
											<CopyIcon />
										</Button>
									</div>

									<TwoFactorQRCode totpUri={totpUri} />
								</>
							)}

							<p>
								<Trans>Then, enter the 6 digit code that the app provides to continue.</Trans>
							</p>

							<form
								className="space-y-4"
								onSubmit={(event) => {
									event.preventDefault();
									event.stopPropagation();
									void verifyForm.handleSubmit();
								}}
							>
								<verifyForm.Field name="code">
									{(field) => (
										<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
											<FormControl
												render={
													<Input
														type="number"
														maxLength={6}
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
								</verifyForm.Field>

								<DialogFooter className="gap-x-2">
									<Button type="button" variant="outline" onClick={requestClose}>
										<Trans comment="Secondary action button to close two-factor setup dialog">Cancel</Trans>
									</Button>
									<Button type="submit">
										<Trans comment="Primary action button to proceed to next step in two-factor setup">Continue</Trans>
									</Button>
								</DialogFooter>
							</form>
						</div>
					);
				})
				.with("backup", () => (
					<div className="space-y-4">
						{backupCodes && (
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-2">
									{backupCodes.map((code) => (
										<div key={code} className="rounded-md border border-border p-2 text-center font-mono text-sm">
											{code}
										</div>
									))}
								</div>

								<div className="flex items-center gap-x-2">
									<Button type="button" variant="outline" onClick={handleDownloadBackupCodes} className="flex-1">
										<ArrowDownIcon className="me-2 size-4" />
										<Trans comment="Action button to download two-factor backup codes as a text file">Download</Trans>
									</Button>
									<Button type="button" variant="ghost" onClick={handleCopyBackupCodes} className="flex-1">
										<CopyIcon className="me-2 size-4" />
										<Trans comment="Action button to copy two-factor backup codes to clipboard">Copy</Trans>
									</Button>
								</div>
							</div>
						)}

						<DialogFooter>
							<Button type="button" onClick={onConfirmBackup}>
								<Trans comment="Final action button after saving backup codes">Continue</Trans>
							</Button>
						</DialogFooter>
					</div>
				))
				.exhaustive()}
		</DialogContent>
	);
}

function extractSecretFromTotpUri(totpUri: string): string | null {
	try {
		const url = new URL(totpUri);
		return url.searchParams.get("secret");
	} catch {
		return null;
	}
}

function TwoFactorQRCode({ totpUri }: { totpUri: string }) {
	return (
		<QRCodeSVG
			value={totpUri}
			size={256}
			marginSize={2}
			className="rounded-md"
			title={t({
				comment: "Accessible title for QR code image shown during two-factor setup",
				message: "Two-Factor Authentication QR Code",
			})}
		/>
	);
}
