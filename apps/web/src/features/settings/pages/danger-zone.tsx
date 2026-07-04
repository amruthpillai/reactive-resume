import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { DownloadSimpleIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { m } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@reactive-resume/ui/components/button";
import { Input } from "@reactive-resume/ui/components/input";
import { downloadWithAnchor, generateFilename } from "@reactive-resume/utils/file";
import { useConfirm } from "@/hooks/use-confirm";
import { authClient } from "@/libs/auth/client";
import { getReadableErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

const CONFIRMATION_TEXT = "delete";

export function DangerZoneSettingsPage() {
	const confirm = useConfirm();
	const navigate = useNavigate();
	const [confirmationText, setConfirmationText] = useState("");
	const isConfirmationValid = confirmationText === CONFIRMATION_TEXT;

	const { mutate: deleteAccount } = useMutation(orpc.auth.deleteAccount.mutationOptions());

	const { mutate: exportData, isPending: isExporting } = useMutation(
		orpc.auth.exportData.mutationOptions({
			onSuccess: (data) => {
				const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
				downloadWithAnchor(blob, generateFilename("reactive-resume-export", "json"));
				toast.success(t`Your data has been exported successfully.`);
			},
			onError: (error) => {
				toast.error(
					getReadableErrorMessage(
						error,
						t({
							comment: "Fallback toast when data export fails",
							message: "Failed to export your data. Please try again.",
						}),
					),
				);
			},
		}),
	);

	const handleDeleteAccount = async () => {
		const confirmed = await confirm(t`Are you sure you want to delete your account?`, {
			description: t`This action cannot be undone. All your data will be permanently deleted.`,
			confirmText: t({
				comment: "Account deletion confirmation dialog confirm action in danger zone",
				message: "Confirm",
			}),
			cancelText: t({
				comment: "Account deletion confirmation dialog cancel action in danger zone",
				message: "Cancel",
			}),
		});

		if (!confirmed) return;

		const toastId = toast.loading(t`Deleting your account...`);

		deleteAccount(undefined, {
			onSuccess: async () => {
				toast.success(t`Your account has been deleted successfully.`, { id: toastId });
				await authClient.signOut();
				void navigate({ to: "/" });
			},
			onError: (error) => {
				toast.error(
					getReadableErrorMessage(
						error,
						t({
							comment: "Fallback toast when account deletion fails",
							message: "Failed to delete your account. Please try again.",
						}),
					),
					{ id: toastId },
				);
			},
		});
	};

	return (
		<m.div
			initial={{ y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.25, ease: "easeOut" }}
			className="grid max-w-xl gap-6 will-change-[transform,opacity]"
		>
			<div className="grid gap-3">
				<p className="leading-relaxed">
					<Trans>Download a copy of all your data, including your profile and every resume, as a JSON file.</Trans>
				</p>

				<m.div
					className="justify-self-start will-change-transform"
					whileHover={{ y: -1, scale: 1.01 }}
					whileTap={{ scale: 0.98 }}
					transition={{ duration: 0.14, ease: "easeOut" }}
				>
					<Button variant="outline" onClick={() => exportData(undefined)} disabled={isExporting}>
						<DownloadSimpleIcon />
						<Trans>Export my data</Trans>
					</Button>
				</m.div>
			</div>

			<hr className="border-border" />

			<p className="leading-relaxed">
				<Trans>To delete your account, you need to enter the confirmation text and click the button below.</Trans>
			</p>

			<Input
				type="text"
				value={confirmationText}
				onChange={(e) => setConfirmationText(e.target.value)}
				placeholder={t`Type "${CONFIRMATION_TEXT}" to confirm`}
			/>

			<m.div
				className="justify-self-end will-change-transform"
				whileHover={!isConfirmationValid ? undefined : { y: -1, scale: 1.01 }}
				whileTap={!isConfirmationValid ? undefined : { scale: 0.98 }}
				transition={{ duration: 0.14, ease: "easeOut" }}
			>
				<Button variant="destructive" onClick={handleDeleteAccount} disabled={!isConfirmationValid}>
					<TrashSimpleIcon />
					<Trans>Delete Account</Trans>
				</Button>
			</m.div>
		</m.div>
	);
}
