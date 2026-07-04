import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
	CaretDownIcon,
	CheckCircleIcon,
	CircleNotchIcon,
	CopySimpleIcon,
	DownloadSimpleIcon,
	FileDocIcon,
	FileJsIcon,
	HouseSimpleIcon,
	LockSimpleIcon,
	LockSimpleOpenIcon,
	PencilSimpleLineIcon,
	PrinterIcon,
	SidebarSimpleIcon,
	TrashSimpleIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { match } from "ts-pattern";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { useDialogStore } from "@/dialogs/store";
import { useCurrentResume, usePatchResume, useSaveStatus } from "@/features/resume/builder/draft";
import { useResumeExport } from "@/features/resume/export/use-resume-export";
import { useConfirm } from "@/hooks/use-confirm";
import { getResumeErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";
import { useBuilderSidebar } from "../-store/sidebar";
import { BuilderAiAssistant } from "./ai-assistant";
import { BuilderVersionHistory } from "./version-history";

export function BuilderHeader() {
	const resume = useCurrentResume();
	const name = resume.name;
	const isLocked = resume.isLocked;
	const toggleSidebar = useBuilderSidebar((state) => state.toggleSidebar);

	// Equal-width flex-1 side groups keep the center title group truly centered regardless of the
	// wider Download button on the right.
	return (
		<div className="absolute inset-x-0 top-0 z-50 flex h-14 items-center gap-x-2 border-b bg-popover px-1.5">
			<div className="flex flex-1 items-center justify-start">
				{/* Hidden below `md`: on mobile the sidebar panels never mount, so `toggleSidebar` no-ops — the bottom tab bar handles this. */}
				<Button size="icon" variant="ghost" className="hidden md:flex" onClick={() => toggleSidebar("left")}>
					<SidebarSimpleIcon />
					<span className="sr-only">
						<Trans comment="Screen-reader label for opening or closing the left sidebar in resume builder">
							Toggle left sidebar
						</Trans>
					</span>
				</Button>
			</div>

			<div className="flex min-w-0 items-center gap-x-1">
				<Button
					size="icon"
					variant="ghost"
					aria-label={t({
						comment: "Accessible label for button navigating from builder to resumes dashboard",
						message: "Go to resumes dashboard",
					})}
					nativeButton={false}
					render={
						<Link to="/dashboard/resumes" search={{ sort: "lastUpdatedAt", tags: [] }}>
							<HouseSimpleIcon />
						</Link>
					}
				/>
				<span className="me-2.5 text-muted-foreground">/</span>
				<h2 className="min-w-0 truncate font-medium">{name}</h2>
				{isLocked && <LockSimpleIcon className="ms-2 text-muted-foreground" />}
				<SaveStatusIndicator />
				<BuilderAiAssistant resumeId={resume.id} />
				<BuilderVersionHistory resumeId={resume.id} />
				<BuilderHeaderDropdown />
			</div>

			<div className="flex flex-1 items-center justify-end gap-x-1">
				<ResumeDownloadButton />

				<Button size="icon" variant="ghost" className="hidden md:flex" onClick={() => toggleSidebar("right")}>
					<SidebarSimpleIcon className="-scale-x-100" />
					<span className="sr-only">
						<Trans comment="Screen-reader label for opening or closing the right sidebar in resume builder">
							Toggle right sidebar
						</Trans>
					</span>
				</Button>
			</div>
		</div>
	);
}

function ResumeDownloadButton() {
	const resume = useCurrentResume();
	const { onDownloadPDF, onDownloadDOCX, onDownloadJSON, onPrint, isExporting } = useResumeExport(resume);

	return (
		<div className="flex items-center">
			<Button size="sm" className="rounded-e-none" disabled={isExporting} onClick={onDownloadPDF}>
				{isExporting ? <CircleNotchIcon className="me-1.5 animate-spin" /> : <DownloadSimpleIcon className="me-1.5" />}
				<Trans comment="Primary action in the builder header to download the resume as a PDF">Download PDF</Trans>
			</Button>

			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							size="sm"
							disabled={isExporting}
							aria-label={t`More download options`}
							className="rounded-s-none border-primary-foreground/20 border-s px-1.5"
						>
							<CaretDownIcon />
						</Button>
					}
				/>

				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={onDownloadDOCX}>
						<FileDocIcon className="me-2" />
						<Trans>Download DOCX</Trans>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={onDownloadJSON}>
						<FileJsIcon className="me-2" />
						<Trans>Download JSON</Trans>
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem onClick={onPrint}>
						<PrinterIcon className="me-2" />
						<Trans>Print</Trans>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function SaveStatusIndicator() {
	const status = useSaveStatus();
	if (status === "idle") return null;

	const { icon, label } = match(status)
		.with("saving", () => ({
			icon: <CircleNotchIcon className="animate-spin" />,
			label: t`Saving…`,
		}))
		.with("saved", () => ({ icon: <CheckCircleIcon />, label: t`Saved` }))
		.with("error", () => ({
			icon: <WarningCircleIcon className="text-destructive" />,
			label: t`Couldn't save`,
		}))
		.exhaustive();

	return (
		<span
			className="ms-1 flex shrink-0 items-center gap-x-1 text-muted-foreground text-xs"
			aria-live="polite"
			role="status"
		>
			{icon}
			<span className="hidden md:inline">{label}</span>
		</span>
	);
}

function BuilderHeaderDropdown() {
	const confirm = useConfirm();
	const navigate = useNavigate();
	const { openDialog } = useDialogStore();

	const resume = useCurrentResume();
	const patchResume = usePatchResume();
	const id = resume.id;
	const name = resume.name;
	const slug = resume.slug;
	const tags = resume.tags;
	const isLocked = resume.isLocked;

	const { mutate: deleteResume } = useMutation(orpc.resume.delete.mutationOptions());
	const { mutate: setLockedResume } = useMutation(orpc.resume.setLocked.mutationOptions());

	const handleUpdate = () => {
		openDialog("resume.update", { id, name, slug, tags });
	};

	const handleDuplicate = () => {
		openDialog("resume.duplicate", { id, name, slug, tags, shouldRedirect: true });
	};

	const handleToggleLock = async () => {
		if (!isLocked) {
			const confirmation = await confirm(t`Are you sure you want to lock this resume?`, {
				description: t`When locked, the resume cannot be updated or deleted.`,
			});

			if (!confirmation) return;
		}

		setLockedResume(
			{ id, isLocked: !isLocked },
			{
				onSuccess: () => {
					patchResume((draft) => {
						draft.isLocked = !isLocked;
					});
				},
				onError: (error) => {
					toast.error(getResumeErrorMessage(error));
				},
			},
		);
	};

	const handleDelete = async () => {
		const confirmation = await confirm(t`Are you sure you want to delete this resume?`, {
			description: t`This action cannot be undone.`,
		});

		if (!confirmation) return;

		const toastId = toast.loading(t`Deleting your resume...`);

		deleteResume(
			{ id },
			{
				onSuccess: () => {
					toast.success(t`Your resume has been deleted successfully.`, { id: toastId });
					void navigate({ to: "/dashboard/resumes", search: { sort: "lastUpdatedAt", tags: [] } });
				},
				onError: (error) => {
					toast.error(getResumeErrorMessage(error), { id: toastId });
				},
			},
		);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button size="icon" variant="ghost" aria-label={t`Resume options`}>
						<CaretDownIcon />
					</Button>
				}
			/>

			<DropdownMenuContent>
				<DropdownMenuItem disabled={isLocked} onClick={handleUpdate}>
					<PencilSimpleLineIcon className="me-2" />
					<Trans>Edit details</Trans>
				</DropdownMenuItem>

				<DropdownMenuItem onClick={handleDuplicate}>
					<CopySimpleIcon className="me-2" />
					<Trans>Duplicate</Trans>
				</DropdownMenuItem>

				<DropdownMenuItem onClick={handleToggleLock}>
					{isLocked ? <LockSimpleOpenIcon className="me-2" /> : <LockSimpleIcon className="me-2" />}
					{isLocked ? <Trans>Unlock</Trans> : <Trans>Lock</Trans>}
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				<DropdownMenuItem variant="destructive" disabled={isLocked} onClick={handleDelete}>
					<TrashSimpleIcon className="me-2" />
					<Trans>Delete</Trans>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
