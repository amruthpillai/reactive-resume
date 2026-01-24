import type { Passkey } from "@better-auth/passkey";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { FingerprintIcon, PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useConfirm } from "@/hooks/use-confirm";
import { usePrompt } from "@/hooks/use-prompt";
import { authClient } from "@/integrations/auth/client";
import { useAuthPasskeys } from "./hooks";

export function PasskeysSection() {
	const prompt = usePrompt();
	const queryClient = useQueryClient();
	const { passkeys } = useAuthPasskeys();

	const handleAddPasskey = async () => {
		const name = await prompt(t`What do you want to call this passkey?`);
		if (!name) return;

		const toastId = toast.loading(t`Adding your passkey...`);

		const { error } = await authClient.passkey.addPasskey({ name, useAutoRegister: true });

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.success(t`Your passkey has been added successfully.`, { id: toastId });
		queryClient.invalidateQueries({ queryKey: ["auth", "passkeys"] });
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: 0.3 }}
		>
			<Separator />

			<div className="mt-4 flex items-center justify-between gap-x-4">
				<h2 className="flex items-center gap-x-3 font-medium text-base">
					<FingerprintIcon />
					<Trans>Passkeys</Trans>
				</h2>

				<Button variant="outline" onClick={handleAddPasskey}>
					<PlusIcon />
					<Trans>Register New Device</Trans>
				</Button>
			</div>

			<AnimatePresence>
				{passkeys.map((passkey) => (
					<PasskeyItem key={passkey.id} passkey={passkey} />
				))}
			</AnimatePresence>
		</motion.div>
	);
}

type PasskeyItemProps = {
	passkey: Passkey;
};

function PasskeyItem({ passkey }: PasskeyItemProps) {
	const confirm = useConfirm();
	const queryClient = useQueryClient();

	const handleDelete = async () => {
		const confirmed = await confirm(t`Are you sure you want to delete this passkey?`, {
			description: t`You cannot use the passkey "${passkey.name ?? "(WebAuthn Device)"}" anymore to sign in after deletion. This action cannot be undone.`,
			confirmText: "Delete",
			cancelText: "Cancel",
		});
		if (!confirmed) return;

		const toastId = toast.loading(t`Deleting your passkey...`);

		const { error } = await authClient.passkey.deletePasskey({ id: passkey.id });

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.success(t`Your passkey has been deleted successfully.`, { id: toastId });
		queryClient.invalidateQueries({ queryKey: ["auth", "passkeys"] });
	};

	return (
		<motion.div
			key={passkey.id}
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			className="mt-3 flex items-center"
		>
			<Button size="icon-sm" variant="ghost" className="shrink-0" onClick={handleDelete}>
				<TrashSimpleIcon />
			</Button>

			<span className="mx-2 truncate text-nowrap border-r pr-2 font-medium">{passkey.name ?? "1Password"}</span>

			<span className="flex-1 truncate text-nowrap text-muted-foreground text-xs">
				<Trans>Added on {passkey.createdAt.toLocaleDateString()}</Trans>
			</span>
		</motion.div>
	);
}
