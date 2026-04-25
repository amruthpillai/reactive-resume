import type { SectionItem } from "@/schema/resume/data";

import { TiptapContent } from "@/components/input/rich-input";
import { filterFieldValues } from "@/utils/field";
import { stripHtml } from "@/utils/string";
import { cn } from "@/utils/style";

import { LinkedTitle } from "../linked-title";
import { PageLink } from "../page-link";

type ExperienceItemProps = SectionItem<"experience"> & {
  className?: string;
};

export function ExperienceItem({ className, ...item }: ExperienceItemProps) {
  const hasRoles = Array.isArray(item.roles) && item.roles.length > 0;
  const headerValues = {
    company: item.company,
    location: item.location,
    position: item.position,
    period: item.period,
  };
  const headerFields = filterFieldValues(
    headerValues,
    {
      key: "company",
      content: (
        <LinkedTitle
          title={item.company}
          website={item.website}
          showLinkInTitle={item.options?.showLinkInTitle}
          className="section-item-title experience-item-title"
        />
      ),
    },
    {
      key: "location",
      content: <span className="section-item-metadata experience-item-location">{item.location}</span>,
    },
    {
      key: "position",
      content: <span className="section-item-metadata experience-item-position">{item.position}</span>,
    },
    {
      key: "period",
      content: <span className="section-item-metadata experience-item-period">{item.period}</span>,
    },
  );
  return (
    <div className={cn("experience-item", className)}>
      {/* Header */}
      <div className="section-item-header experience-item-header">
        <div className="flex items-start justify-between gap-x-2">
          <div className="flex min-w-0 flex-1 flex-col items-start">
            {headerFields.get("company")?.content}
            {headerFields.get("position")?.content}
          </div>

          <div className="flex min-w-0 shrink-0 flex-col items-end text-end">
            {headerFields.get("location")?.content}
            {headerFields.get("period")?.content}
          </div>
        </div>
      </div>

      {/* Role Progression */}
      {hasRoles && (
        <div className="experience-item-roles mt-0 flex flex-col gap-y-1">
          {item.roles.map((role) => (
            <div key={role.id} className="experience-item-role">
              <div className="grid grid-cols-2 items-start justify-between gap-x-2">
                <div className="section-item-metadata experience-item-role-position">{role.position}</div>
                <div className="section-item-metadata experience-item-role-period text-end">{role.period}</div>
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
          className={cn(
            "section-item-description experience-item-description",
            !stripHtml(item.description) && "hidden",
          )}
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
