import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
	EyeIcon,
	HouseSimpleIcon,
	PencilSimpleIcon,
	PencilSimpleLineIcon,
	SidebarIcon,
	SidebarSimpleIcon,
	TrashSimpleIcon,
} from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { cn } from "@reactive-resume/utils/style";
import { useDialogStore } from "@/dialogs/store";
import { useCurrentTemplate } from "@/features/template-editor/store";
import { orpc } from "@/libs/orpc/client";
import { useEditorSidebarStore } from "../-store/sidebar";

export function TemplateEditorHeader() {
	const template = useCurrentTemplate();
	const toggleLeft = useEditorSidebarStore((state) => state.toggleLeftSidebar);
	const toggleRight = useEditorSidebarStore((state) => state.toggleRightSidebar);

	return (
		<div className="absolute inset-x-0 top-0 z-50 grid h-14 grid-cols-[1fr_auto_1fr] items-center border-b bg-popover px-1.5">
			<div className="flex items-center gap-x-1">
				<Button
					size="icon"
					variant="ghost"
					aria-label={t`Go to templates dashboard`}
					nativeButton={false}
					render={
						<Link to="/dashboard/templates">
							<HouseSimpleIcon />
						</Link>
					}
				/>
				<Button size="icon" variant="ghost" onClick={() => toggleLeft()}>
					<SidebarIcon />
					<span className="sr-only">
						<Trans>Toggle components panel</Trans>
					</span>
				</Button>
				<span className="me-2.5 text-muted-foreground">/</span>
				<h2 className="truncate font-medium">{template.name}</h2>
				<TemplateHeaderDropdown />
			</div>

			<ViewModeToggle />

			<div className="flex items-center justify-end">
				<Button size="icon" variant="ghost" onClick={() => toggleRight()}>
					<SidebarSimpleIcon className="-scale-x-100" />
					<span className="sr-only">
						<Trans>Toggle properties panel</Trans>
					</span>
				</Button>
			</div>
		</div>
	);
}

function ViewModeToggle() {
	const viewMode = useEditorSidebarStore((state) => state.viewMode);
	const setViewMode = useEditorSidebarStore((state) => state.setViewMode);

	const options = [
		{ value: "edit", label: <Trans>Edit</Trans>, icon: <PencilSimpleIcon /> },
		{ value: "preview", label: <Trans>Preview</Trans>, icon: <EyeIcon /> },
	] as const;

	return (
		<div className="flex items-center gap-0.5 rounded-md border bg-secondary/40 p-0.5">
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					onClick={() => setViewMode(option.value)}
					className={cn(
						"flex items-center gap-1.5 rounded px-3 py-1 font-medium text-xs transition-colors",
						viewMode === option.value
							? "bg-background text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{option.icon}
					{option.label}
				</button>
			))}
		</div>
	);
}

function TemplateHeaderDropdown() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { openDialog } = useDialogStore();
	const template = useCurrentTemplate();

	const { mutate: deleteTemplate } = useMutation(orpc.customTemplate.delete.mutationOptions());

	const handleRename = () => openDialog("custom-template.update", { id: template.id, name: template.name });

	const handleDelete = () => {
		const toastId = toast.loading(t`Deleting template...`);
		deleteTemplate(
			{ id: template.id },
			{
				onSuccess: () => {
					toast.success(t`Template deleted.`, { id: toastId });
					void queryClient.invalidateQueries({ queryKey: orpc.customTemplate.list.queryOptions().queryKey });
					void navigate({ to: "/dashboard/templates" });
				},
				onError: () => toast.error(t`Failed to delete template.`, { id: toastId }),
			},
		);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button size="icon" variant="ghost" className="ms-1">
						<PencilSimpleLineIcon />
					</Button>
				}
			/>
			<DropdownMenuContent>
				<DropdownMenuItem onClick={handleRename}>
					<PencilSimpleLineIcon className="me-2" />
					<Trans>Rename</Trans>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive" onClick={handleDelete}>
					<TrashSimpleIcon className="me-2" />
					<Trans>Delete</Trans>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
