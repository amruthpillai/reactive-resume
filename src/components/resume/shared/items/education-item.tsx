import { TiptapContent } from "@/components/input/rich-input";
import type { SectionItem } from "@/schema/resume/data";
import { cn } from "@/utils/style";
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
				<div className="flex items-center justify-between">
					<strong className="section-item-title education-item-title">{item.school}</strong>
					<span className="section-item-metadata education-item-degree-grade text-right">
						{[item.degree, item.grade].filter(Boolean).join(" • ")}
					</span>
				</div>

				{/* Row 2 */}
				<div className="flex items-center justify-between">
					<span className="section-item-metadata education-item-area">{item.area}</span>
					<span className="section-item-metadata education-item-location-period text-right">
						{[item.location, item.period].filter(Boolean).join(" • ")}
					</span>
				</div>
			</div>

			{/* Description */}
			<div className="section-item-description education-item-description">
				<TiptapContent content={item.description} />
			</div>

			{/* Website */}
			<div className="section-item-website education-item-website">
				<PageLink {...item.website} label={item.website.label} />
			</div>
		</div>
	);
}
