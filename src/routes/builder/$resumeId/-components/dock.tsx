import { t } from "@lingui/core/macro";
import {
	CircleNotchIcon,
	CubeFocusIcon,
	FileJsIcon,
	FilePdfIcon,
	type Icon,
	LinkSimpleIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback, useMemo } from "react";
import { useControls } from "react-zoom-pan-pinch";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { authClient } from "@/integrations/auth/client";
import { orpc } from "@/integrations/orpc/client";
import { downloadFromUrl, downloadWithAnchor, generateFilename } from "@/utils/file";
import { cn } from "@/utils/style";

export function BuilderDock() {
	const [_, copyToClipboard] = useCopyToClipboard();
	const { data: session } = authClient.useSession();
	const params = useParams({ from: "/builder/$resumeId" });
	const { zoomIn, zoomOut, centerView } = useControls();

	const { data: resume } = useQuery(orpc.resume.getById.queryOptions({ input: { id: params.resumeId } }));
	const { mutateAsync: printResumeAsPDF, isPending: isPrinting } = useMutation(
		orpc.printer.printResumeAsPDF.mutationOptions(),
	);

	const publicUrl = useMemo(() => {
		if (!session || !resume) return "";
		return `${window.location.origin}/${session.user.username}/${resume.slug}`;
	}, [session, resume]);

	const onCopyUrl = useCallback(async () => {
		await copyToClipboard(publicUrl);
		toast.success(t`A link to your resume has been copied to clipboard.`);
	}, [publicUrl, copyToClipboard]);

	const onDownloadJSON = useCallback(async () => {
		if (!resume) return;
		const jsonString = JSON.stringify(resume, null, 2);
		const blob = new Blob([jsonString], { type: "application/json" });
		const filename = generateFilename(resume.data.basics.name, "json");

		downloadWithAnchor(blob, filename);
	}, [resume]);

	const onDownloadPDF = useCallback(async () => {
		if (!resume) return;

		const filename = generateFilename(resume.data.basics.name, "pdf");
		const { url } = await printResumeAsPDF({ id: resume.id });

		downloadFromUrl(url, filename);
	}, [resume, printResumeAsPDF]);

	return (
		<div className="fixed inset-x-0 bottom-4 flex items-center justify-center">
			<motion.div
				initial={{ opacity: 0, y: -50 }}
				animate={{ opacity: 0.5, y: 0 }}
				whileHover={{ opacity: 1 }}
				transition={{ duration: 0.2 }}
				className="flex items-center rounded-r-full rounded-l-full bg-popover px-2 shadow-xl"
			>
				<DockIcon icon={MagnifyingGlassPlusIcon} title={t`Zoom in`} onClick={() => zoomIn(0.1)} />
				<DockIcon icon={MagnifyingGlassMinusIcon} title={t`Zoom out`} onClick={() => zoomOut(0.1)} />
				<DockIcon icon={CubeFocusIcon} title={t`Center view`} onClick={() => centerView()} />
				<div className="mx-1 h-8 w-px bg-border" />
				<DockIcon icon={LinkSimpleIcon} title={t`Copy URL`} onClick={() => onCopyUrl()} />
				<DockIcon icon={FileJsIcon} title={t`Download JSON`} onClick={() => onDownloadJSON()} />
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
};

function DockIcon({ icon: Icon, title, disabled, onClick, iconClassName }: DockIconProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button size="icon" variant="ghost" disabled={disabled} onClick={onClick}>
					<Icon className={cn("size-4", iconClassName)} />
				</Button>
			</TooltipTrigger>
			<TooltipContent side="top" align="center" className="font-medium">
				{title}
			</TooltipContent>
		</Tooltip>
	);
}
