import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ORPCError } from "@orpc/client";
import { ClipboardIcon, LockSimpleIcon, LockSimpleOpenIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";
import { Button } from "@reactive-resume/ui/components/button";
import { Input } from "@reactive-resume/ui/components/input";
import { Label } from "@reactive-resume/ui/components/label";
import { Switch } from "@reactive-resume/ui/components/switch";
import { toast } from "@reactive-resume/ui/components/toast";
import { useCurrentResume, usePatchResume } from "@/features/resume/builder/draft";
import { ResumePasswordDialog } from "@/features/resume/builder/password-dialog";
import { useConfirm } from "@/hooks/use-confirm";
import { authClient } from "@/libs/auth/client";
import { orpc } from "@/libs/orpc/client";
import { SectionBase } from "../shared/section-base";

export function SharingSectionBuilder() {
	const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
	const confirm = useConfirm();
	const [_, copyToClipboard] = useCopyToClipboard();
	const { data: session } = authClient.useSession();
	const resume = useCurrentResume();
	const patchResume = usePatchResume();

	const { mutateAsync: updateResume, isPending: isUpdating } = useMutation(orpc.resume.update.mutationOptions());
	const { mutateAsync: setPassword } = useMutation(orpc.resume.setPassword.mutationOptions());
	const { mutateAsync: removePassword } = useMutation(orpc.resume.removePassword.mutationOptions());

	const publicUrl = session ? `${window.location.origin}/${session.user.username}/${resume.slug}` : "";

	const onCopyUrl = useCallback(async () => {
		await copyToClipboard(publicUrl);
		toast.add({ type: "success", description: t`Resume link copied to clipboard.` });
	}, [publicUrl, copyToClipboard]);

	const onTogglePublic = useCallback(
		async (checked: boolean) => {
			try {
				const updated = await updateResume({ id: resume.id, isPublic: checked });
				patchResume((draft) => {
					draft.isPublic = updated.isPublic;
				});
			} catch (error) {
				const message = error instanceof ORPCError ? error.message : t`Something went wrong. Please try again.`;
				toast.add({ type: "error", description: message });
			}
		},
		[patchResume, resume.id, updateResume],
	);

	const onToggleDownloadButtons = useCallback(
		async (checked: boolean) => {
			try {
				const updated = await updateResume({ id: resume.id, showDownloadButtons: checked });
				patchResume((draft) => {
					draft.showDownloadButtons = updated.showDownloadButtons;
				});
			} catch (error) {
				const message = error instanceof ORPCError ? error.message : t`Something went wrong. Please try again.`;
				toast.add({ type: "error", description: message });
			}
		},
		[patchResume, resume.id, updateResume],
	);

	const onSetPassword = useCallback(
		async (password: string) => {
			await setPassword({ id: resume.id, password });
			patchResume((draft) => {
				draft.hasPassword = true;
			});
			toast.add({ type: "success", description: t`Password protection has been enabled.` });
		},
		[patchResume, resume.id, setPassword],
	);

	const onRemovePassword = useCallback(async () => {
		if (!resume.hasPassword) return;

		const confirmation = await confirm(t`Are you sure you want to remove password protection?`, {
			description: t`Anyone with the public URL will be able to view your resume without a password.`,
			confirmText: t`Confirm`,
			cancelText: t`Cancel`,
		});
		if (!confirmation) return;

		const toastId = toast.add({ type: "loading", description: t`Removing password protection...` });

		try {
			await removePassword({ id: resume.id });
			patchResume((draft) => {
				draft.hasPassword = false;
			});
			toast.add({ type: "success", description: t`Password protection has been disabled.`, id: toastId });
		} catch (error) {
			const message = error instanceof ORPCError ? error.message : t`Something went wrong. Please try again.`;
			toast.add({ type: "error", description: message, id: toastId });
		}
	}, [confirm, patchResume, removePassword, resume.hasPassword, resume.id]);

	const isPasswordProtected = resume.hasPassword;

	return (
		<SectionBase type="sharing" className="space-y-4">
			{isPasswordDialogOpen && (
				<ResumePasswordDialog onSubmit={onSetPassword} onClose={() => setIsPasswordDialogOpen(false)} />
			)}
			<div className="flex items-center gap-x-4">
				<Switch
					id="sharing-switch"
					checked={resume.isPublic}
					onCheckedChange={(checked) => void onTogglePublic(checked)}
				/>

				<Label htmlFor="sharing-switch" className="my-2 flex flex-col items-start gap-y-1 font-normal">
					<span className="font-medium">
						<Trans>Allow Public Access</Trans>
					</span>

					<span className="text-muted-foreground text-xs">
						<Trans>Anyone with the link can view the resume.</Trans>
					</span>
				</Label>
			</div>

			{resume.isPublic && (
				<div className="space-y-4 rounded-md border p-4">
					<div className="flex items-center gap-x-4">
						<Switch
							id="sharing-downloads-switch"
							checked={resume.showDownloadButtons !== false}
							disabled={isUpdating || resume.isLocked}
							onCheckedChange={(checked) => void onToggleDownloadButtons(checked)}
						/>
						<Label htmlFor="sharing-downloads-switch">
							<Trans>Show Download Buttons</Trans>
						</Label>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="sharing-url">
							<Trans comment="Form field label for the generated public resume link in sharing settings">URL</Trans>
						</Label>

						<div className="flex items-center gap-x-2">
							<Input readOnly id="sharing-url" value={publicUrl} />

							<Button size="icon" variant="ghost" aria-label={t`Copy URL`} onClick={onCopyUrl}>
								<ClipboardIcon />
							</Button>
						</div>
					</div>

					<p className="text-muted-foreground">
						{isPasswordProtected ? (
							<Trans>
								Your resume's public URL is protected by a password. Share the password only with people you trust.
							</Trans>
						) : (
							<Trans>Set a password if you want only people who know it to open the public URL.</Trans>
						)}
					</p>

					{isPasswordProtected ? (
						<Button variant="outline" onClick={onRemovePassword}>
							<LockSimpleOpenIcon />
							<Trans>Remove Password</Trans>
						</Button>
					) : (
						<Button variant="outline" onClick={() => setIsPasswordDialogOpen(true)}>
							<LockSimpleIcon />
							<Trans>Set Password</Trans>
						</Button>
					)}
				</div>
			)}
		</SectionBase>
	);
}
