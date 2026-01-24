import { TiptapContent } from "@/components/input/rich-input";
import type { SectionItem } from "@/schema/resume/data";
import { cn } from "@/utils/style";
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
				<div className="flex items-center justify-between">
					<strong className="section-item-title references-item-name">{item.name}</strong>
				</div>

				{/* Row 2 */}
				<div className="flex items-center justify-between">
					<span className="section-item-metadata references-item-position">{item.position}</span>
				</div>
			</div>

			{/* Description */}
			<div className="section-item-description references-item-description">
				<TiptapContent content={item.description} />
			</div>

			{/* Footer */}
			<div className="section-item-footer references-item-footer flex flex-col">
				{/* Row 1 */}
				<div className="flex items-center justify-between">
					<span className="section-item-metadata references-item-phone">{item.phone}</span>
				</div>

				{/* Row 2 */}
				<PageLink
					{...item.website}
					label={item.website.label}
					className="section-item-website references-item-website"
				/>
			</div>
		</div>
	);
}
