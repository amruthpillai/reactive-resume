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
			<div className="section-item-header references-item-header">
				<div className="flex items-center justify-between">
					<p className="section-item-name references-item-name">
						<strong>{item.name}</strong>
					</p>
				</div>
				<p className="section-item-subtitle references-item-position">{item.position}</p>
			</div>
			<div className="section-item-description references-item-description">
				<TiptapContent content={item.description} />
			</div>
			<div className="section-item-footer references-item-footer flex flex-col">
				<div className="section-item-metadata references-item-phone">{item.phone}</div>
				<PageLink {...item.website} label={item.website.label} className="section-item-link references-item-link" />
			</div>
		</div>
	);
}
