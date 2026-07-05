import { Trans } from "@lingui/react/macro";
import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@reactive-resume/ui/components/button";
import { useResume } from "@/features/resume/builder/draft";
import { ResumeDownloadDialog } from "@/features/resume/export/download-dialog";
import { SectionBase } from "../shared/section-base";

export function ExportSectionBuilder() {
	const resume = useResume();

	if (!resume) return null;

	return (
		<SectionBase type="export" className="space-y-4">
			<ResumeDownloadDialog
				resume={resume}
				trigger={(disabled) => (
					<Button
						variant="outline"
						disabled={disabled}
						className="h-auto w-full gap-x-4 whitespace-normal p-4! text-start font-normal active:scale-98"
					>
						<DownloadSimpleIcon className="size-6 shrink-0" />
						<div className="flex flex-1 flex-col gap-y-1">
							<h6 className="font-medium">
								<Trans>Download</Trans>
							</h6>
							<p className="text-muted-foreground text-xs leading-normal">
								<Trans>Choose PDF, DOCX, or JSON. Export your resume and cover letter separately when available.</Trans>
							</p>
						</div>
					</Button>
				)}
			/>
		</SectionBase>
	);
}
