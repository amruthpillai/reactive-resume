import { TiptapContent } from "@/components/input/rich-input";
import type { SectionItem } from "@/schema/resume/data";
import { stripHtml } from "@/utils/string";
import { cn } from "@/utils/style";
import { LinkedTitle } from "../linked-title";
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
					<LinkedTitle
						title={item.organization}
						website={item.website}
						showLinkInTitle={item.options?.showLinkInTitle}
						className="section-item-title volunteer-item-title"
					/>
					<span className="section-item-metadata volunteer-item-period shrink-0 text-end">{item.period}</span>
				</div>

				{/* Row 2 */}
				<div className="flex items-start justify-between gap-x-2">
					<span className="section-item-metadata volunteer-item-location">{item.location}</span>
				</div>
			</div>

			{/* Description */}
			<div
				className={cn("section-item-description volunteer-item-description", !stripHtml(item.description) && "hidden")}
			>
				<TiptapContent content={item.description} />
			</div>

			{/* Website */}
			{!item.options?.showLinkInTitle && (
				<div className="section-item-website volunteer-item-website">
					<PageLink {...item.website} label={item.website.label} />
				</div>
			)}
		</div>
	);
}
