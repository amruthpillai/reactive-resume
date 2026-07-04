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
import { orpc } from "@/libs/orpc/client";

const RELATIVE_TIME_DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
	{ amount: 31_536_000_000, unit: "year" },
	{ amount: 2_592_000_000, unit: "month" },
	{ amount: 604_800_000, unit: "week" },
	{ amount: 86_400_000, unit: "day" },
	{ amount: 3_600_000, unit: "hour" },
	{ amount: 60_000, unit: "minute" },
];

function formatRelativeTime(value: Date | string, formatter: Intl.RelativeTimeFormat) {
	const date = value instanceof Date ? value : new Date(value);
	const diffMs = date.getTime() - Date.now();
	const absMs = Math.abs(diffMs);

	// No division matches only when the gap is under a minute (the smallest division), so fall back to seconds.
	const division = RELATIVE_TIME_DIVISIONS.find((candidate) => absMs >= candidate.amount);
	if (!division) return formatter.format(0, "second");

	return formatter.format(Math.round(diffMs / division.amount), division.unit);
}

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

	const { mutate: restoreVersion, isPending } = useMutation(orpc.resume.restoreVersion.mutationOptions());

	const handleRestore = async (versionId: string) => {
		const confirmed = await confirm(t`Restore this version?`, {
			description: t`Earlier versions are kept; the builder's undo history is reset.`,
		});

		if (!confirmed) return;

		restoreVersion(
			{ resumeId, versionId },
			{
				onSuccess: (restored) => {
					replaceResumeFromServer(restored as Resume);
					queryClient.setQueryData(orpc.resume.getById.queryOptions({ input: { id: resumeId } }).queryKey, restored);
					void queryClient.invalidateQueries({ queryKey: orpc.resume.listVersions.queryKey({ input: { resumeId } }) });
					toast.success(t`Your resume has been restored to the selected version.`);
				},
				onError: (error) => toast.error(getResumeErrorMessage(error)),
			},
		);
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
