import type { SectionItem } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { LinkedTitle } from "../linked-title";
import { PageIcon } from "../page-icon";
import { PageLink } from "../page-link";

type ProfilesItemProps = SectionItem<"profiles"> & {
	className?: string;
};

export function ProfilesItem({ className, ...item }: ProfilesItemProps) {
	return (
		<div className={cn("profiles-item", className)}>
			{/* Header */}
			<div className="section-item-header profiles-item-header flex items-center gap-x-1.5">
				<PageIcon icon={item.icon} className="section-item-icon profiles-item-icon" />
				<LinkedTitle
					title={item.network}
					website={item.website}
					showLinkInTitle={item.options?.showLinkInTitle}
					className="section-item-title profiles-item-network"
				/>
			</div>

			{/* Website */}
			{!item.options?.showLinkInTitle && (
				<PageLink
					{...item.website}
					label={item.website.label || item.username}
					className="section-item-website profiles-item-website"
				/>
			)}
		</div>
	);
}
