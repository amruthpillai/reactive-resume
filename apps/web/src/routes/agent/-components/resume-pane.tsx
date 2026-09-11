import type * as React from "react";
import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowSquareOutIcon, CircleNotchIcon, FilePdfIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { toast } from "@reactive-resume/ui/components/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@reactive-resume/ui/components/tooltip";
import { downloadWithAnchor, generateFilename } from "@reactive-resume/utils/file";
import { createResumePdfBlob } from "@/features/resume/export/pdf-document";
import { ResumePreview } from "@/features/resume/preview/preview";

type ToolbarButtonProps = React.ComponentProps<typeof Button> & {
	label: string;
};

type AgentThreadDetail = RouterOutput["agent"]["threads"]["get"];

export type ResumePaneProps = {
	resume: AgentThreadDetail["resume"];
};

const AGENT_PREVIEW_ZOOM_STORAGE_KEY = "reactive-resume:agent-preview-zoom:v3";
const MIN_PREVIEW_ZOOM = 0.4;
const MAX_PREVIEW_ZOOM = 1.5;
const PREVIEW_ZOOM_STEP = 0.05;
const DEFAULT_PREVIEW_ZOOM = 1;

function clampPreviewZoom(value: number) {
	return Math.min(MAX_PREVIEW_ZOOM, Math.max(MIN_PREVIEW_ZOOM, value));
}

function getInitialPreviewZoom() {
	if (typeof window === "undefined") return DEFAULT_PREVIEW_ZOOM;
	// ponytail: Number(null) === 0, so guard with a null-check before parsing
	const raw = window.localStorage.getItem(AGENT_PREVIEW_ZOOM_STORAGE_KEY);
	if (raw === null) return DEFAULT_PREVIEW_ZOOM;
	const stored = Number(raw);
	return Number.isFinite(stored) ? clampPreviewZoom(stored) : DEFAULT_PREVIEW_ZOOM;
}

function ToolbarButton({ label, children, ...props }: ToolbarButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button size="icon-sm" variant="ghost" aria-label={label} {...props}>
						{children}
					</Button>
				}
			/>
			<TooltipContent side="bottom" align="center">
				{label}
			</TooltipContent>
		</Tooltip>
	);
}

export function ResumePane({ resume }: ResumePaneProps) {
	const [zoom, setZoom] = useState(getInitialPreviewZoom);
	const [isPrinting, setIsPrinting] = useState(false);

	useEffect(() => {
		window.localStorage.setItem(AGENT_PREVIEW_ZOOM_STORAGE_KEY, String(zoom));
	}, [zoom]);

	const setClampedZoom = useCallback((value: number) => {
		setZoom(clampPreviewZoom(Number(value.toFixed(2))));
	}, []);

	const onDownloadPDF = useCallback(async () => {
		if (!resume) return;

		const filename = generateFilename(resume.name || resume.data.basics.name || resume.id, "pdf");
		const toastId = toast.add({
			type: "loading",
			description: t`Generating your PDF...`,
		});

		setIsPrinting(true);

		try {
			const blob = await createResumePdfBlob(resume.data);
			downloadWithAnchor(blob, filename);
		} catch {
			toast.add({ type: "error", description: t`Could not generate the PDF. Please try again.` });
		} finally {
			setIsPrinting(false);
			toast.close(toastId);
		}
	}, [resume]);

	const zoomPercent = Math.round(zoom * 100);

	return (
		<section className="flex h-full min-h-0 flex-col bg-muted/30">
			<div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
				<div>
					<div className="font-semibold">
						<Trans>Resume</Trans>
					</div>
					<div className="text-muted-foreground text-xs">{resume?.name ?? t`Missing working resume`}</div>
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-auto">
				<div className="sticky top-0 z-10 flex h-10 items-center justify-between border-b bg-background/90 px-2 backdrop-blur">
					<div className="flex items-center gap-1">
						<ToolbarButton
							label={t`Decrease zoom`}
							disabled={!resume}
							onClick={() => setClampedZoom(zoom - PREVIEW_ZOOM_STEP)}
						>
							<MinusIcon />
						</ToolbarButton>
						<Tooltip>
							<TooltipTrigger
								render={
									<input
										type="text"
										inputMode="numeric"
										value={`${zoomPercent}%`}
										disabled={!resume}
										aria-label={t`Zoom level`}
										className="h-8 w-14 rounded-md border bg-background px-1 text-center text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
										onChange={(event) => {
											const nextValue = Number(event.target.value.replace(/[^0-9.]/g, ""));
											if (Number.isFinite(nextValue)) setClampedZoom(nextValue / 100);
										}}
									/>
								}
							/>
							<TooltipContent side="bottom" align="center">
								<Trans>Zoom level</Trans>
							</TooltipContent>
						</Tooltip>
						<ToolbarButton
							label={t`Increase zoom`}
							disabled={!resume}
							onClick={() => setClampedZoom(zoom + PREVIEW_ZOOM_STEP)}
						>
							<PlusIcon />
						</ToolbarButton>
					</div>
					<div className="flex items-center gap-1">
						<ToolbarButton
							label={t`Open in builder`}
							disabled={!resume}
							nativeButton={false}
							render={resume ? <Link to="/builder/$resumeId" params={{ resumeId: resume.id }} /> : undefined}
						>
							<ArrowSquareOutIcon />
						</ToolbarButton>
						<ToolbarButton
							label={t`Download PDF`}
							disabled={!resume || isPrinting}
							onClick={() => void onDownloadPDF()}
						>
							{isPrinting ? <CircleNotchIcon className="animate-spin" /> : <FilePdfIcon />}
						</ToolbarButton>
					</div>
				</div>
				<div className="p-4">
					{resume ? (
						<ResumePreview
							data={resume.data}
							pageLayout="vertical"
							pageScale={zoom}
							showPageNumbers
							className="mx-auto"
							pageClassName="shadow-lg"
						/>
					) : (
						<div className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
							<Trans>The working resume was deleted. This thread is read-only.</Trans>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
