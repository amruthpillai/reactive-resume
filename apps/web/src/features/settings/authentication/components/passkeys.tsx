import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { KeyIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@reactive-resume/ui/components/button";
import { Separator } from "@reactive-resume/ui/components/separator";
import { usePrompt } from "@/hooks/use-prompt";
import { authClient } from "@/libs/auth/client";
import { getReadableErrorMessage } from "@/libs/error-message";

export function PasskeysSection() {
	const queryClient = useQueryClient();
	const prompt = usePrompt();

	const { data: passkeys = [] } = useQuery({
		queryKey: ["auth", "passkeys"],
		queryFn: () => authClient.passkey.listUserPasskeys(),
		select: ({ data }) => data ?? [],
	});

	const registerPasskeyMutation = useMutation({
		mutationFn: async () => {
			return await authClient.passkey.addPasskey();
		},
		onSuccess: async ({ data, error }) => {
			if (error) {
				toast.error(
					getReadableErrorMessage(
						error,
						t({
							comment: "Fallback toast when passkey registration fails",
							message: "Failed to register passkey. Please try again.",
						}),
					),
				);
				return;
			}

			toast.success(t`Passkey registered successfully.`);
			await queryClient.invalidateQueries({ queryKey: ["auth", "passkeys"] });

			const name = await prompt(t`Enter a name for your passkey.`, {
				description: t`This will help you identify it later, if you plan to have multiple passkeys.`,
				defaultValue: "",
				confirmText: t({
					comment: "Passkey rename prompt confirm action in authentication settings",
					message: "Save",
				}),
			});
			if (name === null) return;

			const passkeyId = typeof data?.id === "string" ? data.id : null;
			const passkeyName = name.trim();
			if (!passkeyId || passkeyName.length === 0) return;

			const { error: renameError } = await authClient.passkey.updatePasskey({ id: passkeyId, name: passkeyName });
			if (renameError) {
				toast.error(
					getReadableErrorMessage(
						renameError,
						t({
							comment: "Fallback toast when renaming a passkey fails",
							message: "Failed to rename passkey. Please try again.",
						}),
					),
				);
				return;
			}

			await queryClient.invalidateQueries({ queryKey: ["auth", "passkeys"] });
		},
		onError: () => {
			toast.error(t`Failed to register passkey. Please try again.`);
		},
	});

	const deletePasskeyMutation = useMutation({
		mutationFn: async (id: string) => {
			return await authClient.passkey.deletePasskey({ id });
		},
		onSuccess: async ({ error }) => {
			if (error) {
				toast.error(
					getReadableErrorMessage(
						error,
						t({
							comment: "Fallback toast when deleting a passkey fails",
							message: "Failed to delete passkey. Please try again.",
						}),
					),
				);
				return;
			}

			toast.success(t`Passkey deleted successfully.`);
			await queryClient.invalidateQueries({ queryKey: ["auth", "passkeys"] });
		},
		onError: () => {
			toast.error(t`Failed to delete passkey. Please try again.`);
		},
	});

	const handleRegisterPasskey = () => {
		if (registerPasskeyMutation.isPending) return;
		registerPasskeyMutation.mutate();
	};

	const handleDeletePasskey = (id: string) => {
		if (deletePasskeyMutation.isPending) return;
		deletePasskeyMutation.mutate(id);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2, delay: 0.3, ease: "easeOut" }}
			className="will-change-[transform,opacity]"
		>
			<Separator />

			<div className="mt-4 grid gap-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 className="flex items-center gap-x-3 font-medium text-base">
						<KeyIcon />
						<Trans>Passkeys</Trans>
					</h2>

					<Button variant="outline" onClick={handleRegisterPasskey} disabled={registerPasskeyMutation.isPending}>
						<PlusIcon />
						<Trans>Register New Device</Trans>
					</Button>
				</div>

				{passkeys.length === 0 && (
					<p className="text-muted-foreground text-sm">
						<Trans>No passkeys registered yet.</Trans>
					</p>
				)}

				{passkeys.length > 0 && (
					<div className="grid gap-2">
						{passkeys.map((passkey) => {
							return (
								<div
									key={passkey.id}
									className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2"
								>
									<p className="truncate font-medium text-sm">{passkey.name ?? t`Unnamed passkey`}</p>

									<div className="flex items-center gap-2">
										<Button
											variant="destructive"
											size="sm"
											onClick={() => handleDeletePasskey(passkey.id)}
											disabled={deletePasskeyMutation.isPending}
										>
											<TrashIcon />
											<Trans comment="Passkey row action to remove the selected passkey">Delete</Trans>
										</Button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</motion.div>
	);
}
