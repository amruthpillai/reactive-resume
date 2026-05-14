import type { Icon } from "@phosphor-icons/react";
import type { BuilderPreviewPageLayout } from "./page-layout";
import { t } from "@lingui/core/macro";
import {
	AlignCenterHorizontalIcon,
	AlignTopIcon,
	ChatCircleDotsIcon,
	CircleNotchIcon,
	CubeFocusIcon,
	FileDocIcon,
	FileJsIcon,
	FilePdfIcon,
	LinkSimpleIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { useControls } from "react-zoom-pan-pinch";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { Button } from "@reactive-resume/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@reactive-resume/ui/components/tooltip";
import { downloadWithAnchor, generateFilename } from "@reactive-resume/utils/file";
import { buildDocx } from "@reactive-resume/utils/resume/docx";
import { cn } from "@reactive-resume/utils/style";
import { useCurrentResume } from "@/components/resume/builder-resume-draft";
import { authClient } from "@/libs/auth/client";
import { createResumePdfBlob } from "@/libs/resume/pdf-document";

type BuilderDockProps = {
	pageLayout: BuilderPreviewPageLayout;
	onTogglePageLayout: () => void;
};

export function BuilderDock({ pageLayout, onTogglePageLayout }: BuilderDockProps) {
	const { data: session } = authClient.useSession();
	const resume = useCurrentResume();
	const navigate = useNavigate();

	const [_, copyToClipboard] = useCopyToClipboard();
	const { zoomIn, zoomOut, centerView } = useControls();

	const [isPrinting, setIsPrinting] = useState(false);

	const publicUrl = useMemo(() => {
		if (!session?.user.username || !resume?.slug) return "";
		return `${window.location.origin}/${session.user.username}/${resume.slug}`;
	}, [session?.user.username, resume?.slug]);

	const onCopyUrl = useCallback(async () => {
		await copyToClipboard(publicUrl);
		toast.success(t`A link to your resume has been copied to clipboard.`);
	}, [publicUrl, copyToClipboard]);

	const onDownloadJSON = useCallback(async () => {
		if (!resume) return;
		const filename = generateFilename(resume.name, "json");
		const jsonString = JSON.stringify(resume.data, null, 2);
		const blob = new Blob([jsonString], { type: "application/json" });

		downloadWithAnchor(blob, filename);
	}, [resume]);

	const onDownloadDOCX = useCallback(async () => {
		if (!resume) return;
		const filename = generateFilename(resume.name, "docx");

		try {
			const blob = await buildDocx(resume.data);
			downloadWithAnchor(blob, filename);
		} catch {
			toast.error(t`There was a problem while generating the DOCX, please try again.`);
		}
	}, [resume]);

	const onDownloadPDF = useCallback(async () => {
		if (!resume) return;

		const filename = generateFilename(resume.name, "pdf");
		const toastId = toast.loading(t`Please wait while your PDF is being generated...`);

		setIsPrinting(true);

		try {
			const blob = await createResumePdfBlob(resume.data);
			downloadWithAnchor(blob, filename);
		} catch {
			toast.error(t`There was a problem while generating the PDF, please try again.`);
		} finally {
			setIsPrinting(false);
			toast.dismiss(toastId);
		}
	}, [resume]);

	return (
		<div className="fixed inset-x-0 bottom-4 flex items-center justify-center">
			<motion.div
				initial={{ opacity: 0, y: -18 }}
				animate={{ opacity: 0.6, y: 0 }}
				whileHover={{ opacity: 1, y: -2, scale: 1.01 }}
				transition={{ duration: 0.2, ease: "easeOut" }}
				className="flex items-center rounded-r-full rounded-l-full bg-popover px-2 shadow-xl will-change-[transform,opacity]"
			>
				<DockIcon icon={MagnifyingGlassPlusIcon} title={t`Zoom in`} onClick={() => zoomIn(0.1)} />
				<DockIcon icon={MagnifyingGlassMinusIcon} title={t`Zoom out`} onClick={() => zoomOut(0.1)} />
				<DockIcon icon={CubeFocusIcon} title={t`Center view`} onClick={() => centerView()} />
				<DockIcon
					icon={pageLayout === "horizontal" ? AlignTopIcon : AlignCenterHorizontalIcon}
					title={t`Toggle page stacking`}
					onClick={onTogglePageLayout}
				/>
				<DockIcon
					icon={ChatCircleDotsIcon}
					title={t`Open AI agent`}
					onClick={() => {
						if (!resume) return;
						void navigate({ to: "/agent/new", search: { resumeId: resume.id } });
					}}
				/>
				<div className="mx-1 h-8 w-px bg-border" />
				<DockIcon icon={LinkSimpleIcon} title={t`Copy URL`} onClick={() => onCopyUrl()} />
				<DockIcon icon={FileJsIcon} title={t`Download JSON`} onClick={() => onDownloadJSON()} />
				<DockIcon icon={FileDocIcon} title={t`Download DOCX`} onClick={() => onDownloadDOCX()} />
				<DockIcon
					title={t`Download PDF`}
					disabled={isPrinting}
					onClick={() => onDownloadPDF()}
					icon={isPrinting ? CircleNotchIcon : FilePdfIcon}
					iconClassName={cn(isPrinting && "animate-spin")}
				/>
			</motion.div>
		</div>
	);
}

type DockIconProps = {
	title: string;
	icon: Icon;
	disabled?: boolean;
	onClick: () => void;
	iconClassName?: string;
	active?: boolean;
};

function DockIcon({ icon: Icon, title, disabled, onClick, iconClassName, active }: DockIconProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<motion.div
						className="will-change-transform"
						whileHover={disabled ? undefined : { y: -1, scale: 1.04 }}
						whileTap={disabled ? undefined : { scale: 0.97 }}
						transition={{ duration: 0.15, ease: "easeOut" }}
					>
						<Button
							size="icon"
							variant="ghost"
							disabled={disabled}
							className={cn(active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary")}
							onClick={onClick}
							aria-label={title}
						>
							<Icon className={cn("size-4", iconClassName)} />
						</Button>
					</motion.div>
				}
			/>

			<TooltipContent side="top" align="center" className="font-medium">
				{title}
			</TooltipContent>
		</Tooltip>
	);
}
