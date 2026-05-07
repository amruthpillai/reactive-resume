import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { BookOpenIcon, KeyIcon, LinkSimpleIcon, PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@reactive-resume/ui/components/button";
import { Separator } from "@reactive-resume/ui/components/separator";
import { useDialogStore } from "@/dialogs/store";
import { useConfirm } from "@/hooks/use-confirm";
import { authClient } from "@/libs/auth/client";
import { getReadableErrorMessage } from "@/libs/error-message";
import { DashboardHeader } from "../-components/header";

export const Route = createFileRoute("/dashboard/settings/api-keys")({
	component: RouteComponent,
});

function RouteComponent() {
	const confirm = useConfirm();
	const queryClient = useQueryClient();
	const openDialog = useDialogStore((state) => state.openDialog);

	const { data: apiKeys = [] } = useQuery({
		queryKey: ["auth", "api-keys"],
		queryFn: () => authClient.apiKey.list(),
		select: ({ data }) => {
			if (!data) return [];

			return data.apiKeys
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
				.filter((key) => !!key.expiresAt && key.expiresAt.getTime() > Date.now());
		},
	});

	const onDelete = async (id: string) => {
		const confirmation = await confirm(t`Are you sure you want to delete this API key?`, {
			description: t`The API key will no longer be able to access your data after deletion. This action cannot be undone.`,
			confirmText: t({
				comment: "API key deletion confirmation dialog confirm action in settings",
				message: "Delete",
			}),
			cancelText: t({
				comment: "API key deletion confirmation dialog cancel action in settings",
				message: "Cancel",
			}),
		});

		if (!confirmation) return;

		const toastId = toast.loading(t`Deleting your API key...`);

		const { error } = await authClient.apiKey.delete({ keyId: id });

		if (error) {
			toast.error(
				getReadableErrorMessage(
					error,
					t({
						comment: "Fallback toast when deleting an API key fails",
						message: "Failed to delete the API key. Please try again.",
					}),
				),
				{ id: toastId },
			);
			return;
		}

		toast.success(t`The API key has been deleted successfully.`, { id: toastId });
		void queryClient.invalidateQueries({ queryKey: ["auth", "api-keys"] });
	};

	return (
		<div className="space-y-4">
			<DashboardHeader icon={KeyIcon} title={t`API Keys`} />

			<Separator />

			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.25, ease: "easeOut" }}
				className="grid max-w-xl gap-6 will-change-[transform,opacity]"
			>
				<div className="flex items-start gap-4 rounded-md border bg-popover p-6">
					<div className="rounded-md bg-primary/10 p-2.5">
						<BookOpenIcon className="text-primary" size={24} />
					</div>

					<div className="flex-1 space-y-2">
						<h3 className="font-semibold">
							<Trans>How do I use the API?</Trans>
						</h3>

						<p className="text-muted-foreground leading-relaxed">
							<Trans>
								Explore the API documentation to learn how to integrate Reactive Resume with your applications. Find
								detailed endpoints, request examples, and authentication methods.
							</Trans>
						</p>

						<Button
							variant="link"
							nativeButton={false}
							render={
								<a href="https://docs.rxresu.me/api-reference" target="_blank" rel="noopener noreferrer">
									<LinkSimpleIcon />
									<Trans>API Reference</Trans>
								</a>
							}
						/>
					</div>
				</div>

				<Separator />

				<div>
					<Button
						variant="outline"
						className="h-auto w-full py-3"
						onClick={() => openDialog("api-key.create", undefined)}
					>
						<PlusIcon />
						<Trans>Create a new API key</Trans>
					</Button>

					<AnimatePresence initial={false} mode="popLayout">
						{apiKeys.map((key, index) => (
							<motion.div
								key={key.id}
								className="flex items-center gap-x-4 py-4 will-change-[transform,opacity]"
								initial={{ opacity: 0, y: -16 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -16 }}
								transition={{ duration: 0.16, delay: Math.min(0.12, index * 0.04) }}
							>
								<KeyIcon />

								<div className="flex-1 space-y-1">
									<p className="font-mono text-xs">{key.start}...</p>
									<div className="text-muted-foreground text-xs">
										<Trans>Expires on {key.expiresAt?.toLocaleDateString()}</Trans>
									</div>
								</div>

								<motion.div
									className="will-change-transform"
									whileHover={{ y: -1, scale: 1.03 }}
									whileTap={{ scale: 0.96 }}
									transition={{ duration: 0.14, ease: "easeOut" }}
								>
									<Button size="icon" variant="ghost" onClick={() => onDelete(key.id)}>
										<TrashSimpleIcon />
									</Button>
								</motion.div>
							</motion.div>
						))}
					</AnimatePresence>
				</div>
			</motion.div>
		</div>
	);
}
