import { TiptapContent } from "@/components/input/rich-input";
import type { SectionItem } from "@/schema/resume/data";
import { cn } from "@/utils/style";
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
				<div className="flex items-center justify-between">
					<strong className="section-item-title certifications-item-title">{item.title}</strong>
					<span className="section-item-metadata certifications-item-date text-right">{item.date}</span>
				</div>

				{/* Row 2 */}
				<div className="flex items-center justify-between">
					<span className="section-item-metadata certifications-item-issuer">{item.issuer}</span>
				</div>
			</div>

			{/* Description */}
			<div className="section-item-description certifications-item-description">
				<TiptapContent content={item.description} />
			</div>

			{/* Website */}
			<div className="section-item-website certifications-item-website">
				<PageLink {...item.website} label={item.website.label} />
			</div>
		</div>
	);
}
