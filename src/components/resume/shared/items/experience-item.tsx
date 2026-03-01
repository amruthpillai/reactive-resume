import { TiptapContent } from "@/components/input/rich-input";
import type { SectionItem } from "@/schema/resume/data";
import { stripHtml } from "@/utils/string";
import { cn } from "@/utils/style";
import { LinkedTitle } from "../linked-title";
import { PageLink } from "../page-link";

type ExperienceItemProps = SectionItem<"experience"> & {
	className?: string;
};

export function ExperienceItem({ className, ...item }: ExperienceItemProps) {
	const hasRoles = Array.isArray(item.roles) && item.roles.length > 0;

	return (
		<div className={cn("experience-item", className)}>
			{/* Header */}
			<div className="section-item-header experience-item-header">
				{/* Row 1: Company + Location */}
				<div className="flex items-start justify-between gap-x-2">
					<LinkedTitle
						title={item.company}
						website={item.website}
						showLinkInTitle={item.options?.showLinkInTitle}
						className="section-item-title experience-item-title"
					/>
					<span className="section-item-metadata experience-item-location shrink-0 text-end">{item.location}</span>
				</div>

				{/* Row 2: Position + Period */}
				{(!hasRoles || item.position) && (
					<div className="flex items-start justify-between gap-x-2">
						<span className="section-item-metadata experience-item-position">{item.position}</span>
						<span className="section-item-metadata experience-item-period shrink-0 text-end">{item.period}</span>
					</div>
				)}

				{/* Overall period when hasRoles and no summary position */}
				{hasRoles && !item.position && item.period && (
					<div className="flex items-start justify-end gap-x-2">
						<span className="section-item-metadata experience-item-period shrink-0 text-end">{item.period}</span>
					</div>
				)}
			</div>

			{/* Role Progression */}
			{hasRoles && (
				<div className="experience-item-roles mt-1 flex flex-col gap-y-2">
					{item.roles!.map((role) => (
						<div key={role.id} className="experience-item-role pl-3 border-l-2 border-primary/30">
							<div className="flex items-start justify-between gap-x-2">
								<span className="section-item-metadata experience-item-role-position font-medium">{role.position}</span>
								<span className="section-item-metadata experience-item-role-period shrink-0 text-end">{role.period}</span>
							</div>

							{stripHtml(role.description) && (
								<div className="section-item-description experience-item-role-description mt-0.5">
									<TiptapContent content={role.description} />
								</div>
							)}
						</div>
					))}
				</div>
			)}

			{/* Single-role description */}
			{!hasRoles && (
				<div
					className={cn("section-item-description experience-item-description", !stripHtml(item.description) && "hidden")}
				>
					<TiptapContent content={item.description} />
				</div>
			)}

			{/* Website */}
			{!item.options?.showLinkInTitle && (
				<div className="section-item-website experience-item-website">
					<PageLink {...item.website} label={item.website.label} />
				</div>
			)}
		</div>
	);
}
