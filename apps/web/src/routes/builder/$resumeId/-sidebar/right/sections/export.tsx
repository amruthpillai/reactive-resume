import { Trans } from "@lingui/react/macro";
import { CircleNotchIcon, FileDocIcon, FileJsIcon, FilePdfIcon } from "@phosphor-icons/react";
import { Button } from "@reactive-resume/ui/components/button";
import { useResume } from "@/features/resume/builder/draft";
import { useResumeExport } from "@/features/resume/export/use-resume-export";
import { SectionBase } from "../shared/section-base";

export function ExportSectionBuilder() {
	const resume = useResume();
	const { onDownloadJSON, onDownloadDOCX, onDownloadPDF, isExporting } = useResumeExport(resume);

	if (!resume) return null;

	return (
		<SectionBase type="export" className="space-y-4">
			<Button
				variant="outline"
				onClick={onDownloadJSON}
				className="h-auto gap-x-4 whitespace-normal p-4! text-start font-normal active:scale-98"
			>
				<FileJsIcon className="size-6 shrink-0" />
				<div className="flex flex-1 flex-col gap-y-1">
					<h6 className="font-medium">JSON</h6>
					<p className="text-muted-foreground text-xs leading-normal">
						<Trans>
							Download a copy of your resume in JSON format. Use this file for backup or to import your resume into
							other applications, including AI assistants.
						</Trans>
					</p>
				</div>
			</Button>

			<Button
				variant="outline"
				onClick={onDownloadDOCX}
				className="h-auto gap-x-4 whitespace-normal p-4! text-start font-normal active:scale-98"
			>
				<FileDocIcon className="size-6 shrink-0" />
				<div className="flex flex-1 flex-col gap-y-1">
					<h6 className="font-medium">DOCX</h6>
					<p className="text-muted-foreground text-xs leading-normal">
						<Trans>
							Download a copy of your resume as a Word document. Use this file to further customize your resume in
							Microsoft Word or Google Docs.
						</Trans>
					</p>
				</div>
			</Button>

			<Button
				variant="outline"
				disabled={isExporting}
				onClick={onDownloadPDF}
				className="h-auto gap-x-4 whitespace-normal p-4! text-start font-normal active:scale-98"
			>
				{isExporting ? (
					<CircleNotchIcon className="size-6 shrink-0 animate-spin" />
				) : (
					<FilePdfIcon className="size-6 shrink-0" />
				)}

				<div className="flex flex-1 flex-col gap-y-1">
					<h6 className="font-medium">PDF</h6>
					<p className="text-muted-foreground text-xs leading-normal">
						<Trans>
							Download a copy of your resume in PDF format. Use this file for printing or to easily share your resume
							with recruiters.
						</Trans>
					</p>
				</div>
			</Button>
		</SectionBase>
	);
}
