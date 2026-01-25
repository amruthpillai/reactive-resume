import type { SectionItem } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { PageIcon } from "../page-icon";

type InterestsItemProps = SectionItem<"interests"> & {
	className?: string;
};

export function InterestsItem({ className, ...item }: InterestsItemProps) {
	return (
		<div className={cn("interests-item", className)}>
			{/* Header */}
			<div className="section-item-header interests-item-header flex items-center gap-x-1.5">
				<PageIcon icon={item.icon} className="section-item-icon interests-item-icon" />
				<strong className="section-item-title interests-item-name">{item.name}</strong>
			</div>

			{/* Keywords */}
			<span className="section-item-keywords interests-item-keywords inline-block opacity-80">
				{item.keywords.join(", ")}
			</span>
		</div>
	);
}
