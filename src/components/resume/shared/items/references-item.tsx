import { TiptapContent } from "@/components/input/rich-input";
import type { SectionItem } from "@/schema/resume/data";
import { stripHtml } from "@/utils/string";
import { cn } from "@/utils/style";
import { LinkedTitle } from "../linked-title";
import { PageLink } from "../page-link";

type ReferencesItemProps = SectionItem<"references"> & {
	className?: string;
};

export function ReferencesItem({ className, ...item }: ReferencesItemProps) {
	return (
		<div className={cn("references-item", className)}>
			{/* Header */}
			<div className="section-item-header references-item-header">
				{/* Row 1 */}
				<div className="flex items-start justify-between gap-x-2">
					<LinkedTitle
						title={item.name}
						website={item.website}
						showLinkInTitle={item.options?.showLinkInTitle}
						className="section-item-title references-item-name"
					/>
				</div>

				{/* Row 2 */}
				<div className="flex items-start justify-between gap-x-2">
					<span className="section-item-metadata references-item-position">{item.position}</span>
				</div>
			</div>

			{/* Description */}
			<div
				className={cn("section-item-description references-item-description", !stripHtml(item.description) && "hidden")}
			>
				<TiptapContent content={item.description} />
			</div>

			{/* Footer */}
			<div className="section-item-footer references-item-footer flex flex-col">
				{/* Row 1 */}
				<span className="section-item-metadata references-item-phone inline-block">{item.phone}</span>

				{/* Row 2 */}
				{!item.options?.showLinkInTitle && (
					<PageLink
						{...item.website}
						label={item.website.label}
						className="section-item-website references-item-website"
					/>
				)}
			</div>
		</div>
	);
}
