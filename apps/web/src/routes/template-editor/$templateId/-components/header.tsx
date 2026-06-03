import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { HouseSimpleIcon, PencilSimpleLineIcon, SidebarSimpleIcon, TrashSimpleIcon } from "@phosphor-icons/react";
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
import { useDialogStore } from "@/dialogs/store";
import { useCurrentTemplate } from "@/features/template-editor/store";
import { orpc } from "@/libs/orpc/client";
import { useEditorSidebarStore } from "../-store/sidebar";

export function TemplateEditorHeader() {
	const template = useCurrentTemplate();
	const toggleRight = useEditorSidebarStore((state) => state.toggleRightSidebar);

	return (
		<div className="absolute inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b bg-popover px-1.5">
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
				<span className="me-2.5 text-muted-foreground">/</span>
				<h2 className="flex-1 truncate font-medium">{template.name}</h2>
				<TemplateHeaderDropdown />
			</div>

			<Button size="icon" variant="ghost" onClick={() => toggleRight()}>
				<SidebarSimpleIcon className="-scale-x-100" />
				<span className="sr-only">
					<Trans>Toggle right sidebar</Trans>
				</span>
			</Button>
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
