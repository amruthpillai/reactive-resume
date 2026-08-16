import type { Resume } from "@/features/resume/builder/draft";
import { i18n } from "@lingui/core";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { useResumeStore } from "@/features/resume/builder/draft";
import { useConfirm } from "@/hooks/use-confirm";
import { getResumeErrorMessage } from "@/libs/error-message";
import { formatRelativeTime } from "@/libs/locale";
import { orpc } from "@/libs/orpc/client";

type BuilderVersionHistoryProps = {
	resumeId: string;
};

export function BuilderVersionHistory({ resumeId }: BuilderVersionHistoryProps) {
	const [open, setOpen] = useState(false);
	const confirm = useConfirm();
	const queryClient = useQueryClient();
	const replaceResumeFromServer = useResumeStore((state) => state.replaceResumeFromServer);

	const relativeTimeFormatter = useMemo(() => new Intl.RelativeTimeFormat(i18n.locale, { numeric: "auto" }), []);

	const { data: versions, isLoading } = useQuery({
		...orpc.resume.listVersions.queryOptions({ input: { resumeId } }),
		enabled: open,
	});

	const { mutateAsync: restoreVersion, isPending } = useMutation(orpc.resume.restoreVersion.mutationOptions());

	const handleRestore = async (versionId: string) => {
		const confirmed = await confirm(t`Restore this version?`, {
			description: t`Earlier versions are kept; the builder's undo history is reset.`,
		});

		if (!confirmed) return;

		try {
			const restored = await restoreVersion({ resumeId, versionId });
			replaceResumeFromServer(restored as Resume);
			queryClient.setQueryData(orpc.resume.getById.queryOptions({ input: { id: resumeId } }).queryKey, restored);
			void queryClient.invalidateQueries({ queryKey: orpc.resume.listVersions.queryKey({ input: { resumeId } }) });
			toast.success(t`Your resume has been restored to the selected version.`);
		} catch (error) {
			toast.error(getResumeErrorMessage(error));
		}
	};

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger
				render={
					<Button size="icon" variant="ghost" aria-label={t`Version history`}>
						<ClockCounterClockwiseIcon />
					</Button>
				}
			/>

			<DropdownMenuContent align="start" className="w-64">
				<DropdownMenuGroup>
					<DropdownMenuLabel>
						<Trans>Version history</Trans>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />

					{isLoading && (
						<div className="px-2 py-3 text-muted-foreground text-xs">
							<Trans>Loading…</Trans>
						</div>
					)}

					{!isLoading && (!versions || versions.length === 0) && (
						<div className="px-2 py-3 text-muted-foreground text-xs">
							<Trans>No saved versions yet.</Trans>
						</div>
					)}

					{versions?.map((version) => (
						<DropdownMenuItem
							key={version.id}
							disabled={isPending}
							className="flex-col items-start gap-0.5"
							onClick={() => handleRestore(version.id)}
						>
							<span className="font-medium">{version.label}</span>
							<span className="text-muted-foreground text-xs">
								{formatRelativeTime(version.createdAt, relativeTimeFormatter)}
							</span>
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
