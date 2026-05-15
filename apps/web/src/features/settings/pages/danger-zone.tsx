import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { TrashSimpleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@reactive-resume/ui/components/button";
import { Input } from "@reactive-resume/ui/components/input";
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
		<motion.div
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.25, ease: "easeOut" }}
			className="grid max-w-xl gap-6 will-change-[transform,opacity]"
		>
			<p className="leading-relaxed">
				<Trans>To delete your account, you need to enter the confirmation text and click the button below.</Trans>
			</p>

			<Input
				type="text"
				value={confirmationText}
				onChange={(e) => setConfirmationText(e.target.value)}
				placeholder={t`Type "${CONFIRMATION_TEXT}" to confirm`}
			/>

			<motion.div
				className="justify-self-end will-change-transform"
				whileHover={!isConfirmationValid ? undefined : { y: -1, scale: 1.01 }}
				whileTap={!isConfirmationValid ? undefined : { scale: 0.98 }}
				transition={{ duration: 0.14, ease: "easeOut" }}
			>
				<Button variant="destructive" onClick={handleDeleteAccount} disabled={!isConfirmationValid}>
					<TrashSimpleIcon />
					<Trans>Delete Account</Trans>
				</Button>
			</motion.div>
		</motion.div>
	);
}
