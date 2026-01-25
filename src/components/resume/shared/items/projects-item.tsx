import { TiptapContent } from "@/components/input/rich-input";
import type { SectionItem } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { PageLink } from "../page-link";

type ProjectsItemProps = SectionItem<"projects"> & {
	className?: string;
};

export function ProjectsItem({ className, ...item }: ProjectsItemProps) {
	return (
		<div className={cn("projects-item", className)}>
			{/* Header */}
			<div className="section-item-header projects-item-header">
				{/* Row 1 */}
				<div className="flex items-start justify-between gap-x-2">
					<strong className="section-item-title projects-item-title">{item.name}</strong>
					<span className="section-item-metadata projects-item-period shrink-0 text-end">{item.period}</span>
				</div>
			</div>

			{/* Description */}
			<div className="section-item-description projects-item-description">
				<TiptapContent content={item.description} />
			</div>

			{/* Website */}
			<div className="section-item-website projects-item-website">
				<PageLink {...item.website} label={item.website.label} />
			</div>
		</div>
	);
}
