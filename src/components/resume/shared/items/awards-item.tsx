import { TiptapContent } from "@/components/input/rich-input";
import type { SectionItem } from "@/schema/resume/data";
import { stripHtml } from "@/utils/string";
import { cn } from "@/utils/style";
import { LinkedTitle } from "../linked-title";
import { PageLink } from "../page-link";

type AwardsItemProps = SectionItem<"awards"> & {
	className?: string;
};

export function AwardsItem({ className, ...item }: AwardsItemProps) {
	return (
		<div className={cn("awards-item", className)}>
			{/* Header */}
			<div className="section-item-header awards-item-header">
				{/* Row 1 */}
				<div className="flex items-start justify-between gap-x-2">
					<LinkedTitle
						title={item.title}
						website={item.website}
						showLinkInTitle={item.options?.showLinkInTitle}
						className="section-item-title awards-item-title"
					/>
					<span className="section-item-metadata awards-item-date shrink-0 text-end">{item.date}</span>
				</div>

				{/* Row 2 */}
				<div className="flex items-start justify-between gap-x-2">
					<span className="section-item-metadata awards-item-awarder">{item.awarder}</span>
				</div>
			</div>

			{/* Description */}
			<div className={cn("section-item-description awards-item-description", !stripHtml(item.description) && "hidden")}>
				<TiptapContent content={item.description} />
			</div>

			{/* Website */}
			{!item.options?.showLinkInTitle && (
				<div className="section-item-website awards-item-website">
					<PageLink {...item.website} label={item.website.label} />
				</div>
			)}
		</div>
	);
}
