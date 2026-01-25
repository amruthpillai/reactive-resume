import { TiptapContent } from "@/components/input/rich-input";
import type { SectionItem } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { PageLink } from "../page-link";

type PublicationsItemProps = SectionItem<"publications"> & {
	className?: string;
};

export function PublicationsItem({ className, ...item }: PublicationsItemProps) {
	return (
		<div className={cn("publications-item", className)}>
			{/* Header */}
			<div className="section-item-header publications-item-header">
				{/* Row 1 */}
				<div className="flex items-start justify-between gap-x-2">
					<strong className="section-item-title publications-item-title">{item.title}</strong>
					<span className="section-item-metadata publications-item-date shrink-0 text-end">{item.date}</span>
				</div>

				{/* Row 2 */}
				<div className="flex items-start justify-between gap-x-2">
					<span className="section-item-metadata publications-item-publisher">{item.publisher}</span>
				</div>
			</div>

			{/* Description */}
			<div className="section-item-description publications-item-description">
				<TiptapContent content={item.description} />
			</div>

			{/* Website */}
			<div className="section-item-website publications-item-website">
				<PageLink {...item.website} label={item.website.label} />
			</div>
		</div>
	);
}
