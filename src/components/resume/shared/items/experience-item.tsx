import { TiptapContent } from "@/components/input/rich-input";
import type { SectionItem } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { PageLink } from "../page-link";

type ExperienceItemProps = SectionItem<"experience"> & {
	className?: string;
};

export function ExperienceItem({ className, ...item }: ExperienceItemProps) {
	return (
		<div className={cn("experience-item", className)}>
			{/* Header */}
			<div className="section-item-header experience-item-header">
				{/* Row 1 */}
				<div className="flex items-start justify-between gap-x-2">
					<strong className="section-item-title experience-item-title">{item.company}</strong>
					<span className="section-item-metadata experience-item-location shrink-0 text-end">{item.location}</span>
				</div>

				{/* Row 2 */}
				<div className="flex items-start justify-between gap-x-2">
					<span className="section-item-metadata experience-item-position">{item.position}</span>
					<span className="section-item-metadata experience-item-period shrink-0 text-end">{item.period}</span>
				</div>
			</div>

			{/* Description */}
			<div className="section-item-description experience-item-description">
				<TiptapContent content={item.description} />
			</div>

			{/* Website */}
			<div className="section-item-website experience-item-website">
				<PageLink {...item.website} label={item.website.label} />
			</div>
		</div>
	);
}
