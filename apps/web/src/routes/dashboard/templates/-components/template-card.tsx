import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { PencilSimpleLineIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { m } from "motion/react";
import { useMemo } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@reactive-resume/ui/components/context-menu";
import { templates } from "@/dialogs/resume/template/data";
import { useDialogStore } from "@/dialogs/store";
import { BaseCard } from "../../resumes/-components/cards/base-card";

type Template = RouterOutput["customTemplate"]["list"][number];

export function TemplateCard({ template }: { template: Template }) {
	const { i18n } = useLingui();
	const { openDialog } = useDialogStore();

	const updatedAt = useMemo(
		() => Intl.DateTimeFormat(i18n.locale, { dateStyle: "long", timeStyle: "short" }).format(template.updatedAt),
		[i18n.locale, template.updatedAt],
	);

	const baseImage =
		templates[template.data.baseTemplate as keyof typeof templates]?.imageUrl ?? "/templates/jpg/azurill.jpg";

	const handleRename = () => openDialog("custom-template.update", { id: template.id, name: template.name });
	const handleDelete = () => openDialog("custom-template.delete", { id: template.id, name: template.name });

	return (
		<ContextMenu>
			<ContextMenuTrigger>
				<Link to="/template-editor/$templateId" params={{ templateId: template.id }} className="cursor-default">
					<m.div
						className="will-change-transform"
						whileHover={{ y: -2, scale: 1.005 }}
						whileTap={{ scale: 0.998 }}
						transition={{ type: "spring", stiffness: 320, damping: 28 }}
					>
						<BaseCard title={template.name} description={t`Last updated on ${updatedAt}`}>
							<div className="absolute inset-0 overflow-hidden">
								<img src={baseImage} alt={template.name} className="size-full object-cover object-top opacity-60" />
							</div>
						</BaseCard>
					</m.div>
				</Link>
			</ContextMenuTrigger>

			<ContextMenuContent>
				<ContextMenuItem onClick={handleRename}>
					<PencilSimpleLineIcon className="me-2" />
					{t`Rename`}
				</ContextMenuItem>

				<ContextMenuSeparator />

				<ContextMenuItem variant="destructive" onClick={handleDelete}>
					<TrashSimpleIcon className="me-2" />
					{t`Delete`}
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
