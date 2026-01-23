import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { BookOpenIcon, KeyIcon, LinkSimpleIcon, PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDialogStore } from "@/dialogs/store";
import { useConfirm } from "@/hooks/use-confirm";
import { authClient } from "@/integrations/auth/client";
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
			if (!data?.apiKeys) return [];

			return data.apiKeys
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
				.filter((key) => !!key.expiresAt && key.expiresAt.getTime() > Date.now());
		},
	});

	const onDelete = async (id: string) => {
		const confirmation = await confirm(t`Are you sure you want to delete this API key?`, {
			description: t`The API key will no longer be able to access your data after deletion. This action cannot be undone.`,
			confirmText: t`Delete`,
			cancelText: t`Cancel`,
		});

		if (!confirmation) return;

		const toastId = toast.loading(t`Deleting your API key...`);

		const { error } = await authClient.apiKey.delete({ keyId: id });

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.success(t`The API key has been deleted successfully.`, { id: toastId });
		queryClient.invalidateQueries({ queryKey: ["auth", "api-keys"] });
	};

	return (
		<div className="space-y-4">
			<DashboardHeader icon={KeyIcon} title={t`API Keys`} />

			<Separator />

			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className="grid max-w-xl gap-6"
			>
				<div className="flex items-start gap-4 rounded-sm border bg-popover p-6">
					<div className="rounded-sm bg-primary/10 p-2.5">
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

						<Button asChild variant="link">
							<a href="https://docs.rxresu.me/api-reference" target="_blank" rel="noopener">
								<LinkSimpleIcon />
								<Trans>API Reference</Trans>
							</a>
						</Button>
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

					<AnimatePresence>
						{apiKeys.map((key, index) => (
							<motion.div
								key={key.id}
								className="flex items-center gap-x-4 py-4"
								initial={{ opacity: 0, y: -16 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -16 }}
								transition={{ delay: index * 0.08 }}
							>
								<KeyIcon />

								<div className="flex-1 space-y-1">
									<p className="font-mono text-xs">{key.start}...</p>
									<div className="text-muted-foreground text-xs">
										<Trans>Expires on {key.expiresAt?.toLocaleDateString()}</Trans>
									</div>
								</div>

								<Button size="icon" variant="ghost" onClick={() => onDelete(key.id)}>
									<TrashSimpleIcon />
								</Button>
							</motion.div>
						))}
					</AnimatePresence>
				</div>
			</motion.div>
		</div>
	);
}
