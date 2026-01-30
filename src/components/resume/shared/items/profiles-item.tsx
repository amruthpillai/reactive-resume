import type { SectionItem } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { PageIcon } from "../page-icon";
import { PageLink } from "../page-link";

type ProfilesItemProps = SectionItem<"profiles"> & {
	className?: string;
};

export function ProfilesItem({ className, ...item }: ProfilesItemProps) {
	const shouldOverride = item.useLabelAsNetwork && (item.website.label || item.username);

	return (
		<div className={cn("profiles-item", className)}>
			{/* Header */}
			<div className="section-item-header profiles-item-header flex items-center gap-x-1.5">
				<PageIcon icon={item.icon} className="section-item-icon profiles-item-icon" />
				<strong className="section-item-title profiles-item-network">
					{shouldOverride ? item.website.label || item.username : item.network}
				</strong>
			</div>

			{/* Website */}
			{!shouldOverride && (
				<PageLink
					{...item.website}
					label={item.website.label || item.username}
					className="section-item-website profiles-item-website"
				/>
			)}
		</div>
	);
}
