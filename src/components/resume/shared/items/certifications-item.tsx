import { TiptapContent } from "@/components/input/rich-input";
import type { SectionItem } from "@/schema/resume/data";
import { stripHtml } from "@/utils/string";
import { cn } from "@/utils/style";
import { LinkedTitle } from "../linked-title";
import { PageLink } from "../page-link";

type CertificationsItemProps = SectionItem<"certifications"> & {
	className?: string;
};

export function CertificationsItem({ className, ...item }: CertificationsItemProps) {
	return (
		<div className={cn("certifications-item", className)}>
			{/* Header */}
			<div className="section-item-header certifications-item-header">
				{/* Row 1 */}
				<div className="flex items-start justify-between gap-x-2">
					<LinkedTitle
						title={item.title}
						website={item.website}
						showLinkInTitle={item.options?.showLinkInTitle}
						className="section-item-title certifications-item-title"
					/>
					<span className="section-item-metadata certifications-item-date shrink-0 text-end">{item.date}</span>
				</div>

				{/* Row 2 */}
				<div className="flex items-start justify-between gap-x-2">
					<span className="section-item-metadata certifications-item-issuer">{item.issuer}</span>
				</div>
			</div>

			{/* Description */}
			<div
				className={cn(
					"section-item-description certifications-item-description",
					!stripHtml(item.description) && "hidden",
				)}
			>
				<TiptapContent content={item.description} />
			</div>

			{/* Website */}
			{!item.options?.showLinkInTitle && (
				<div className="section-item-website certifications-item-website">
					<PageLink {...item.website} label={item.website.label} />
				</div>
			)}
		</div>
	);
}
