import type { Icon } from "@phosphor-icons/react";
import type { BuilderPreviewPageLayout } from "./page-layout";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
	AlignCenterHorizontalIcon,
	AlignTopIcon,
	ArrowUUpLeftIcon,
	ArrowUUpRightIcon,
	ChatCircleDotsIcon,
	LinkSimpleIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
} from "@phosphor-icons/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useNavigate } from "@tanstack/react-router";
import { m } from "motion/react";
import { useCallback, useMemo } from "react";
import { useControls, useTransformComponent } from "react-zoom-pan-pinch";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@reactive-resume/ui/components/tooltip";
import { cn } from "@reactive-resume/utils/style";
import {
	isEditableElementFocused,
	useCanRedo,
	useCanUndo,
	useCurrentResume,
	useRedoResume,
	useUndoResume,
} from "@/features/resume/builder/draft";
import { authClient } from "@/libs/auth/client";

type BuilderDockProps = {
	pageLayout: BuilderPreviewPageLayout;
	onTogglePageLayout: () => void;
};

export function BuilderDock({ pageLayout, onTogglePageLayout }: BuilderDockProps) {
	const { data: session } = authClient.useSession();
	const resume = useCurrentResume();
	const navigate = useNavigate();

	const [_, copyToClipboard] = useCopyToClipboard();
	const { zoomIn, zoomOut, resetTransform } = useControls();

	const canUndo = useCanUndo();
	const canRedo = useCanRedo();
	const undo = useUndoResume();
	const redo = useRedoResume();

	useHotkey("Mod+0", () => resetTransform());
	// App-level undo/redo of resume state, scoped to the builder. Mod maps to Cmd (mac) / Ctrl (win/linux).
	// Inside a focused text field, defer to the browser's native input undo; the dock buttons remain
	// available for resume-level history while editing a field.
	useHotkey("Mod+Z", () => {
		if (isEditableElementFocused()) return;
		undo();
	});
	useHotkey("Mod+Shift+Z", () => {
		if (isEditableElementFocused()) return;
		redo();
	});
	useHotkey("Control+Y", () => {
		if (isEditableElementFocused()) return;
		redo();
	});

	const publicUrl = useMemo(() => {
		if (!session?.user.username || !resume?.slug) return "";
		return `${window.location.origin}/${session.user.username}/${resume.slug}`;
	}, [session?.user.username, resume?.slug]);

	const onCopyUrl = useCallback(async () => {
		await copyToClipboard(publicUrl);
		toast.success(t`A link to your resume has been copied to clipboard.`);
	}, [publicUrl, copyToClipboard]);

	return (
		<div className="fixed inset-x-0 bottom-20 flex items-center justify-center md:bottom-4">
			<m.div
				initial={{ opacity: 0, y: -18 }}
				animate={{ opacity: 0.6, y: 0 }}
				whileHover={{ opacity: 1, y: -2, scale: 1.01 }}
				transition={{ duration: 0.2, ease: "easeOut" }}
				className="flex items-center rounded-r-full rounded-l-full bg-popover px-2 shadow-xl will-change-[transform,opacity]"
			>
				<DockIcon icon={ArrowUUpLeftIcon} title={t`Undo`} disabled={!canUndo} onClick={() => undo()} />
				<DockIcon icon={ArrowUUpRightIcon} title={t`Redo`} disabled={!canRedo} onClick={() => redo()} />
				<div className="mx-1 h-8 w-px bg-border" />
				<DockIcon icon={MagnifyingGlassMinusIcon} title={t`Zoom out`} onClick={() => zoomOut(0.15)} />
				<ZoomMenu />
				<DockIcon icon={MagnifyingGlassPlusIcon} title={t`Zoom in`} onClick={() => zoomIn(0.15)} />
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
			</m.div>
		</div>
	);
}

function ZoomMenu() {
	const scale = useTransformComponent((ctx) => ctx.state.scale);
	const { centerView, resetTransform } = useControls();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						size="sm"
						variant="ghost"
						aria-label={t`Zoom level`}
						className="h-8 min-w-14 px-2 font-medium text-xs tabular-nums"
					>
						{Math.round(scale * 100)}%
					</Button>
				}
			/>

			<DropdownMenuContent side="top" align="center">
				<DropdownMenuItem onClick={() => centerView(1)}>
					<Trans>Actual size (100%)</Trans>
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => resetTransform()}>
					<Trans>Fit to view</Trans>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
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
					<m.div
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
					</m.div>
				}
			/>

			<TooltipContent side="top" align="center" className="font-medium">
				{title}
			</TooltipContent>
		</Tooltip>
	);
}
