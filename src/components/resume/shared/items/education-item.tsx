import { TiptapContent } from "@/components/input/rich-input";
import type { SectionItem } from "@/schema/resume/data";
import { stripHtml } from "@/utils/string";
import { cn } from "@/utils/style";
import { LinkedTitle } from "../linked-title";
import { PageLink } from "../page-link";

type EducationItemProps = SectionItem<"education"> & {
	className?: string;
};

export function EducationItem({ className, ...item }: EducationItemProps) {
	return (
		<div className={cn("education-item", className)}>
			{/* Header */}
			<div className="section-item-header education-item-header mb-2">
				{/* Row 1 */}
				<div className="flex items-start justify-between gap-x-2">
					<LinkedTitle
						title={item.school}
						website={item.website}
						showLinkInTitle={item.options?.showLinkInTitle}
						className="section-item-title education-item-title"
					/>
					<span className="section-item-metadata education-item-degree-grade shrink-0 text-end">
						{[item.degree, item.grade].filter(Boolean).join(" • ")}
					</span>
				</div>

				{/* Row 2 */}
				<div className="flex items-start justify-between gap-x-2">
					<span className="section-item-metadata education-item-area">{item.area}</span>
					<span className="section-item-metadata education-item-location-period shrink-0 text-end">
						{[item.location, item.period].filter(Boolean).join(" • ")}
					</span>
				</div>
			</div>

			{/* Description */}
			<div
				className={cn("section-item-description education-item-description", !stripHtml(item.description) && "hidden")}
			>
				<TiptapContent content={item.description} />
			</div>

			{/* Website */}
			{!item.options?.showLinkInTitle && (
				<div className="section-item-website education-item-website">
					<PageLink {...item.website} label={item.website.label} />
				</div>
			)}
		</div>
	);
}
