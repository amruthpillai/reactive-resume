import { TiptapContent } from "@/components/input/rich-input";
import type { SectionItem } from "@/schema/resume/data";
import { stripHtml } from "@/utils/string";
import { cn } from "@/utils/style";
import { LinkedTitle } from "../linked-title";
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
					<LinkedTitle
						title={item.company}
						website={item.website}
						showLinkInTitle={item.options?.showLinkInTitle}
						className="section-item-title experience-item-title"
					/>
					<span className="section-item-metadata experience-item-location shrink-0 text-end">{item.location}</span>
				</div>

				{/* Row 2 */}
				<div className="flex items-start justify-between gap-x-2">
					<span className="section-item-metadata experience-item-position">{item.position}</span>
					<span className="section-item-metadata experience-item-period shrink-0 text-end">{item.period}</span>
				</div>
			</div>

			{/* Description */}
			<div
				className={cn("section-item-description experience-item-description", !stripHtml(item.description) && "hidden")}
			>
				<TiptapContent content={item.description} />
			</div>

			{/* Website */}
			{!item.options?.showLinkInTitle && (
				<div className="section-item-website experience-item-website">
					<PageLink {...item.website} label={item.website.label} />
				</div>
			)}
		</div>
	);
}
