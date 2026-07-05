import type { ResumeExportTarget } from "@reactive-resume/resume/export-sections";
import type { ReactElement, ReactNode } from "react";
import { Trans } from "@lingui/react/macro";
import {
	CircleNotchIcon,
	DownloadSimpleIcon,
	EnvelopeSimpleIcon,
	FileDocIcon,
	FileJsIcon,
	FilePdfIcon,
	FileTextIcon,
	MarkdownLogoIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@reactive-resume/ui/components/dialog";
import { Tabs, TabsList, TabsTrigger } from "@reactive-resume/ui/components/tabs";
import { cn } from "@reactive-resume/utils/style";
import { useResumeExport } from "./use-resume-export";

type DownloadableResume = Parameters<typeof useResumeExport>[0];

type ResumeDownloadDialogProps = {
	resume: DownloadableResume;
	trigger: (disabled: boolean) => ReactElement;
};

type FormatRowProps = {
	action: ReactElement;
	description: ReactNode;
	disabled?: boolean;
	icon: ReactElement;
	title: ReactNode;
};

function FormatRow({ action, description, disabled, icon, title }: FormatRowProps) {
	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-lg border bg-background p-3 transition-opacity",
				disabled && "opacity-45",
			)}
		>
			<div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
				{icon}
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<h3 className="font-medium text-sm">{title}</h3>
				<p className="text-muted-foreground text-xs leading-normal">{description}</p>
			</div>
			{action}
		</div>
	);
}

export function ResumeDownloadDialog({ resume, trigger }: ResumeDownloadDialogProps) {
	const [open, setOpen] = useState(false);
	const [scope, setScope] = useState<ResumeExportTarget>("resume");
	const { hasCoverLetter, isExporting, onDownloadDOCX, onDownloadJSON, onDownloadMarkdown, onDownloadPDF } =
		useResumeExport(resume);
	const disabled = !resume || isExporting;

	// Cover letter can't be the active scope when the resume has none (also guards a stale toggle).
	const activeScope: ResumeExportTarget = scope === "cover-letter" && !hasCoverLetter ? "resume" : scope;
	const jsonDisabled = activeScope === "cover-letter";

	const run = (action: () => void | Promise<void>) => {
		setOpen(false);
		void action();
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={trigger(disabled)} />
			<DialogContent className="gap-5 sm:max-w-lg">
				<DialogHeader className="pe-8">
					<DialogTitle>
						<Trans>Download</Trans>
					</DialogTitle>
					<DialogDescription>
						<Trans>Export your resume or cover letter in the format you need.</Trans>
					</DialogDescription>
				</DialogHeader>

				<Tabs value={activeScope} onValueChange={(value) => setScope(value as ResumeExportTarget)}>
					<TabsList className="h-11! w-full">
						<TabsTrigger value="resume">
							<FileTextIcon />
							<Trans>Resume</Trans>
						</TabsTrigger>
						<TabsTrigger value="cover-letter" disabled={!hasCoverLetter}>
							<EnvelopeSimpleIcon />
							<Trans>Cover letter</Trans>
						</TabsTrigger>
					</TabsList>
				</Tabs>

				<div className="grid gap-2">
					<FormatRow
						icon={
							isExporting ? <CircleNotchIcon className="size-5 animate-spin" /> : <FilePdfIcon className="size-5" />
						}
						title="PDF"
						description={<Trans>Best for applications, sharing, and printing.</Trans>}
						action={
							<Button
								size="sm"
								aria-label="Download PDF"
								disabled={isExporting}
								onClick={() => run(() => onDownloadPDF(activeScope))}
							>
								<DownloadSimpleIcon />
								<Trans>Download</Trans>
							</Button>
						}
					/>

					<FormatRow
						icon={<FileDocIcon className="size-5" />}
						title="DOCX"
						description={<Trans>Editable in Word, Google Docs, and Pages.</Trans>}
						action={
							<Button
								size="sm"
								variant="outline"
								aria-label="Download DOCX"
								disabled={isExporting}
								onClick={() => run(() => onDownloadDOCX(activeScope))}
							>
								<DownloadSimpleIcon />
								<Trans>Download</Trans>
							</Button>
						}
					/>

					<FormatRow
						icon={<MarkdownLogoIcon className="size-5" />}
						title="Markdown"
						description={<Trans>Plain text, ideal for AI tools and quick edits.</Trans>}
						action={
							<Button
								size="sm"
								variant="outline"
								aria-label="Download Markdown"
								disabled={isExporting}
								onClick={() => run(() => onDownloadMarkdown(activeScope))}
							>
								<DownloadSimpleIcon />
								<Trans>Download</Trans>
							</Button>
						}
					/>

					<FormatRow
						disabled={jsonDisabled}
						icon={<FileJsIcon className="size-5" />}
						title="JSON"
						description={<Trans>Full resume data for backup or import.</Trans>}
						action={
							<Button
								size="sm"
								variant="outline"
								aria-label="Download JSON"
								disabled={jsonDisabled}
								onClick={() => run(onDownloadJSON)}
							>
								<DownloadSimpleIcon />
								<Trans>Download</Trans>
							</Button>
						}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
