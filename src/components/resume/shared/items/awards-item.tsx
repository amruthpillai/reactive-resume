import { TiptapContent } from "@/components/input/rich-input";
import type { SectionItem } from "@/schema/resume/data";
import { cn } from "@/utils/style";
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
				<div className="flex items-center justify-between">
					<strong className="section-item-title awards-item-title">{item.title}</strong>
					<span className="section-item-metadata awards-item-date text-right">{item.date}</span>
				</div>

				{/* Row 2 */}
				<div className="flex items-center justify-between">
					<span className="section-item-metadata awards-item-awarder">{item.awarder}</span>
				</div>
			</div>

			{/* Description */}
			<div className="section-item-description awards-item-description">
				<TiptapContent content={item.description} />
			</div>

			{/* Website */}
			<div className="section-item-website awards-item-website">
				<PageLink {...item.website} label={item.website.label} />
			</div>
		</div>
	);
}
