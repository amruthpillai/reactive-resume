import type { ReactNode } from "react";
import type { ExtractProgress } from "./extract-client";
import type { AtsCheckResult } from "./run-ats-check";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowClockwiseIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useCallback, useRef, useState } from "react";
import { Alert, AlertDescription } from "@reactive-resume/ui/components/alert";
import { Button } from "@reactive-resume/ui/components/button";
import { Label } from "@reactive-resume/ui/components/label";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { PdfPasswordRequiredError, PdfTooLargeError, PdfUnreadableError } from "./extract-client";
import { AtsPdfReportView } from "./report/report-view";
import { runAtsCheck } from "./run-ats-check";
import { AtsUploader } from "./uploader";

const MAX_JOB_DESCRIPTION_CHARS = 20_000;

function progressLabel(progress: ExtractProgress | null): string {
	if (!progress || progress.phase === "loading") return t`Opening the file…`;
	if (progress.phase === "text") return t`Reading page ${progress.page} of ${progress.pageCount}…`;
	return t`Inspecting page ${progress.page} of ${progress.pageCount}…`;
}

function errorMessage(error: unknown): string {
	if (error instanceof PdfPasswordRequiredError) {
		return t`This PDF is password protected. Save an unprotected copy and try again.`;
	}
	if (error instanceof PdfTooLargeError) return t`That file is too large to check in the browser.`;
	if (error instanceof PdfUnreadableError) return t`That file could not be read as a PDF.`;
	return t`Something went wrong while reading that file. Please try again.`;
}

export type AtsAiTierContext = {
	result: AtsCheckResult;
	jobDescription: string;
};

type AtsCheckerToolProps = {
	/** Rendered under the report once a check has run. */
	renderAiTier?: (context: AtsAiTierContext) => ReactNode;
};

export function AtsCheckerTool({ renderAiTier }: AtsCheckerToolProps) {
	const [file, setFile] = useState<File | null>(null);
	const [jobDescription, setJobDescription] = useState("");
	const [result, setResult] = useState<AtsCheckResult | null>(null);
	const [progress, setProgress] = useState<ExtractProgress | null>(null);
	const [error, setError] = useState<unknown>(null);
	const [isRunning, setIsRunning] = useState(false);

	const abortRef = useRef<AbortController | null>(null);

	const run = useCallback(async (selected: File, description: string) => {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setIsRunning(true);
		setError(null);
		setResult(null);
		setProgress(null);

		try {
			const next = await runAtsCheck(selected, {
				jobDescription: description,
				onProgress: setProgress,
				signal: controller.signal,
			});

			if (!controller.signal.aborted) setResult(next);
		} catch (caught) {
			if (!controller.signal.aborted) setError(caught);
		} finally {
			if (!controller.signal.aborted) {
				setIsRunning(false);
				setProgress(null);
			}
		}
	}, []);

	const onSelect = (selected: File) => {
		setFile(selected);
		void run(selected, jobDescription);
	};

	return (
		<div className="space-y-4">
			<AtsUploader onSelect={onSelect} disabled={isRunning} selectedFileName={file?.name ?? null} />

			<div className="space-y-2">
				<Label htmlFor="ats-job-description">
					<Trans>Job description (optional)</Trans>
				</Label>
				<Textarea
					id="ats-job-description"
					rows={4}
					maxLength={MAX_JOB_DESCRIPTION_CHARS}
					value={jobDescription}
					placeholder={t`Paste the posting to see which of its terms already appear in your resume.`}
					onChange={(event) => setJobDescription(event.target.value)}
				/>
			</div>

			{file && !isRunning && (
				<Button variant="outline" size="sm" onClick={() => void run(file, jobDescription)}>
					<ArrowClockwiseIcon />
					<Trans>Check again</Trans>
				</Button>
			)}

			{isRunning && (
				<div className="flex items-center gap-2 rounded-md border border-dashed p-3">
					<Spinner className="size-4 shrink-0" />
					<span className="text-muted-foreground text-sm">{progressLabel(progress)}</span>
				</div>
			)}

			{error != null && (
				<Alert variant="destructive">
					<WarningCircleIcon />
					<AlertDescription>{errorMessage(error)}</AlertDescription>
				</Alert>
			)}

			{result && (
				<>
					<AtsPdfReportView report={result.report} />
					{renderAiTier?.({ result, jobDescription })}
				</>
			)}
		</div>
	);
}
