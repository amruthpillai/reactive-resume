import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowSquareOutIcon, SidebarSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { cn } from "@reactive-resume/utils/style";
import { CometCard } from "@/components/animation/comet-card";

type TemplateRow = RouterOutput["templates"]["list"][number];

type Props = {
	template: TemplateRow;
	isActive: boolean;
	resumeId: string | undefined;
	onActivate: (id: string) => void;
	onExport: (id: string) => void;
	onDelete: (id: string) => void;
};

const PREVIEW_FALLBACK = (id: string) => `/templates/jpg/${id}.jpg`;

export function TemplateManagementCard({ template, isActive, resumeId, onActivate, onExport, onDelete }: Props) {
	const isUserOwned = template.userId !== null;
	const visibleTags = template.tags.slice(0, 3);
	const overflowCount = template.tags.length - 3;

	const sidebarLabel =
		template.sidebarPosition === "left"
			? t`Left sidebar`
			: template.sidebarPosition === "right"
				? t`Right sidebar`
				: null;

	return (
		<div className="group/card relative flex flex-col gap-y-2">
			<CometCard translateDepth={3} rotateDepth={6} glareOpacity={0}>
				<button
					type="button"
					aria-label={t`Select template ${template.name}`}
					onClick={() => resumeId && onActivate(template.id)}
					className={cn(
						"relative block aspect-page size-full cursor-pointer overflow-hidden rounded-md bg-popover outline-none",
						isActive && "ring-2 ring-ring ring-offset-4 ring-offset-background",
						!resumeId && "cursor-default",
					)}
				>
					<img
						src={PREVIEW_FALLBACK(template.id)}
						alt={template.name}
						className="size-full object-cover"
						onError={(e) => {
							(e.currentTarget as HTMLImageElement).src = "/templates/jpg/azurill.jpg";
						}}
					/>

					{sidebarLabel && (
						<div className="absolute top-2 right-2 rounded-full bg-background/80 p-1" title={sidebarLabel}>
							<SidebarSimpleIcon size={14} />
						</div>
					)}

					{isActive && resumeId && (
						<div className="absolute inset-0 flex items-center justify-center bg-background/40">
							<Badge variant="default">
								<Trans>Active</Trans>
							</Badge>
						</div>
					)}
				</button>
			</CometCard>

			<div className="flex items-start justify-between gap-x-2 px-1">
				<div className="min-w-0 space-y-1">
					<p className="truncate font-bold leading-tight tracking-tight">{template.name}</p>
					{template.author && (
						<p className="truncate text-muted-foreground text-xs">
							<Trans>by {template.author}</Trans>
						</p>
					)}
					<div className="flex flex-wrap gap-1">
						{visibleTags.map((tag) => (
							<Badge key={tag} variant="secondary" className="text-xs">
								{tag}
							</Badge>
						))}
						{overflowCount > 0 && (
							<Badge variant="outline" className="text-xs">
								+{overflowCount}
							</Badge>
						)}
						{!isUserOwned && (
							<Badge variant="outline" className="text-xs">
								<Trans>Built-in</Trans>
							</Badge>
						)}
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-x-1">
					<Button
						size="icon"
						variant="ghost"
						className="size-7"
						aria-label={t`Export template ${template.name}`}
						onClick={() => onExport(template.id)}
					>
						<ArrowSquareOutIcon size={14} />
					</Button>

					{isUserOwned && (
						<Button
							size="icon"
							variant="ghost"
							className="size-7 text-destructive hover:text-destructive"
							aria-label={t`Delete template ${template.name}`}
							onClick={() => onDelete(template.id)}
						>
							<TrashIcon size={14} />
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
