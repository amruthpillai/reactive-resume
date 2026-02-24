import { TrashSimpleIcon, WarningIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useConfirm } from "@/hooks/use-confirm";
import { authClient } from "@/integrations/auth/client";
import { orpc } from "@/integrations/orpc/client";
import { DashboardHeader } from "../-components/header";

export const Route = createFileRoute("/dashboard/settings/danger-zone")({
	component: RouteComponent,
});

const CONFIRMATION_TEXT = "delete";

function RouteComponent() {
	const confirm = useConfirm();
	const navigate = useNavigate();
	const [confirmationText, setConfirmationText] = useState("");
	const isConfirmationValid = confirmationText === CONFIRMATION_TEXT;

	const { mutate: deleteAccount } = useMutation(orpc.auth.deleteAccount.mutationOptions());

	const handleDeleteAccount = async () => {
		const confirmed = await confirm("Are you sure you want to delete your account?", {
			description: "This action cannot be undone. All your data will be permanently deleted.",
			confirmText: "Confirm",
			cancelText: "Cancel",
		});

		if (!confirmed) return;

		const toastId = toast.loading("Deleting your account...");

		deleteAccount(undefined, {
			onSuccess: async () => {
				toast.success("Your account has been deleted successfully.", { id: toastId });
				await authClient.signOut();
				navigate({ to: "/" });
			},
			onError: (error) => {
				toast.error(error.message, { id: toastId });
			},
		});
	};

	return (
		<div className="space-y-4">
			<DashboardHeader icon={WarningIcon} title={"Danger Zone"} />

			<Separator />

			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className="grid max-w-xl gap-6"
			>
				<p className="leading-relaxed">
					To delete your account, you need to enter the confirmation text and click the button below.
				</p>

				<Input
					type="text"
					value={confirmationText}
					onChange={(e) => setConfirmationText(e.target.value)}
					placeholder={`Type "${CONFIRMATION_TEXT}" to confirm`}
				/>

				<Button
					className="justify-self-end"
					variant="destructive"
					onClick={handleDeleteAccount}
					disabled={!isConfirmationValid}
				>
					<TrashSimpleIcon />
					Delete Account
				</Button>
			</motion.div>
		</div>
	);
}
