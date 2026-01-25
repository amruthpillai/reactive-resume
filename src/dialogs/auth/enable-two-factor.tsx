import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowDownIcon, CopyIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { useRouter } from "@tanstack/react-router";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { match } from "ts-pattern";
import { useToggle } from "usehooks-ts";
import z from "zod";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authClient } from "@/integrations/auth/client";
import { type DialogProps, useDialogStore } from "../store";

const enableFormSchema = z.object({
	password: z.string().min(6).max(64),
});

type EnableFormValues = z.infer<typeof enableFormSchema>;

const verifyFormSchema = z.object({
	code: z.string().length(6, "Code must be 6 digits"),
});

type VerifyFormValues = z.infer<typeof verifyFormSchema>;

export function EnableTwoFactorDialog(_: DialogProps<"auth.two-factor.enable">) {
	const router = useRouter();

	const [totpUri, setTotpUri] = useState<string | null>(null);
	const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
	const [step, setStep] = useState<"enable" | "verify" | "backup">("enable");

	const [showPassword, toggleShowPassword] = useToggle(false);
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const enableForm = useForm<EnableFormValues>({
		resolver: zodResolver(enableFormSchema),
		defaultValues: {
			password: "",
		},
	});

	const verifyForm = useForm<VerifyFormValues>({
		resolver: zodResolver(verifyFormSchema),
		defaultValues: {
			code: "",
		},
	});

	const onEnableSubmit = async (values: EnableFormValues) => {
		const toastId = toast.loading(t`Enabling two-factor authentication...`);

		const { data, error } = await authClient.twoFactor.enable({
			password: values.password,
			issuer: "Reactive Resume",
		});

		if (error) {
			toast.error(error.message, { id: toastId });
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
	};

	const onVerifySubmit = async (data: VerifyFormValues) => {
		const toastId = toast.loading(t`Verifying code...`);

		const { error } = await authClient.twoFactor.verifyTotp({ code: data.code });

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.dismiss(toastId);
		setStep("backup");
	};

	const onConfirmBackup = () => {
		toast.success(t`Two-factor authentication has been setup successfully.`);
		router.invalidate();
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
		<DialogContent className="max-w-md">
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
					<Form {...enableForm}>
						<form onSubmit={enableForm.handleSubmit(onEnableSubmit)} className="space-y-4">
							<FormField
								control={enableForm.control}
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
													autoComplete="current-password"
													{...field}
												/>
											</FormControl>

											<Button size="icon" variant="ghost" type="button" onClick={toggleShowPassword}>
												{showPassword ? <EyeIcon /> : <EyeSlashIcon />}
											</Button>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>

							<DialogFooter>
								<Button type="submit">
									<Trans>Continue</Trans>
								</Button>
							</DialogFooter>
						</form>
					</Form>
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

							<Form {...verifyForm}>
								<form onSubmit={verifyForm.handleSubmit(onVerifySubmit)}>
									<FormField
										control={verifyForm.control}
										name="code"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<InputOTP
														maxLength={6}
														value={field.value}
														onChange={field.onChange}
														pattern={REGEXP_ONLY_DIGITS}
														onComplete={verifyForm.handleSubmit(onVerifySubmit)}
														pasteTransformer={(pasted) => pasted.replaceAll("-", "")}
													>
														<InputOTPGroup>
															<InputOTPSlot index={0} className="size-12" />
															<InputOTPSlot index={1} className="size-12" />
															<InputOTPSlot index={2} className="size-12" />
															<InputOTPSlot index={3} className="size-12" />
															<InputOTPSlot index={4} className="size-12" />
															<InputOTPSlot index={5} className="size-12" />
														</InputOTPGroup>
													</InputOTP>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<DialogFooter className="gap-x-2">
										<Button type="button" variant="outline" onClick={closeDialog}>
											<Trans>Cancel</Trans>
										</Button>
										<Button type="submit">
											<Trans>Continue</Trans>
										</Button>
									</DialogFooter>
								</form>
							</Form>
						</div>
					);
				})
				.with("backup", () => (
					<div className="space-y-4">
						{backupCodes && (
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-2">
									{backupCodes.map((code, index) => (
										<div key={index} className="rounded-md border border-border p-2 text-center font-mono text-sm">
											{code}
										</div>
									))}
								</div>

								<div className="flex items-center gap-x-2">
									<Button type="button" variant="outline" onClick={handleDownloadBackupCodes} className="flex-1">
										<ArrowDownIcon className="me-2 size-4" />
										<Trans>Download</Trans>
									</Button>
									<Button type="button" variant="ghost" onClick={handleCopyBackupCodes} className="flex-1">
										<CopyIcon className="me-2 size-4" />
										<Trans>Copy</Trans>
									</Button>
								</div>
							</div>
						)}

						<DialogFooter>
							<Button type="button" onClick={onConfirmBackup}>
								<Trans>Continue</Trans>
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
			title="Two-Factor Authentication QR Code"
		/>
	);
}
