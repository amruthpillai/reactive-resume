import { TiptapContent } from "@/components/input/rich-input";
import type { SectionItem } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { PageLink } from "../page-link";

type VolunteerItemProps = SectionItem<"volunteer"> & {
	className?: string;
};

export function VolunteerItem({ className, ...item }: VolunteerItemProps) {
	return (
		<div className={cn("volunteer-item", className)}>
			{/* Header */}
			<div className="section-item-header volunteer-item-header">
				{/* Row 1 */}
				<div className="flex items-start justify-between gap-x-2">
					<strong className="section-item-title volunteer-item-title">{item.organization}</strong>
					<span className="section-item-metadata volunteer-item-period shrink-0 text-end">{item.period}</span>
				</div>

				{/* Row 2 */}
				<div className="flex items-start justify-between gap-x-2">
					<span className="section-item-metadata volunteer-item-location">{item.location}</span>
				</div>
			</div>

			{/* Description */}
			<div className="section-item-description volunteer-item-description">
				<TiptapContent content={item.description} />
			</div>

			{/* Website */}
			<div className="section-item-website volunteer-item-website">
				<PageLink {...item.website} label={item.website.label} />
			</div>
		</div>
	);
}
