import type { SectionItem } from "@/schema/resume/data";

import { TiptapContent } from "@/components/input/rich-input";
import { filterFieldValues } from "@/utils/field";
import { stripHtml } from "@/utils/string";
import { cn } from "@/utils/style";

import { InlineHeader } from "../inline-header";
import { LinkedTitle } from "../linked-title";
import { PageLink } from "../page-link";

type ExperienceItemProps = SectionItem<"experience"> & {
  className?: string;
  /**
   * Controls the header layout of each entry.
   * - `"split"` (default): two-column layout — company/position on the start side,
   *   location/period on the end side. This preserves the behavior used by all
   *   existing templates.
   * - `"inline"`: single-row, three-column layout — `[position (location)]`,
   *   `[company]`, `[period]`. Used by templates targeting compact single-line
   *   entry headers (e.g., Asian resume conventions).
   */
  headerLayout?: "split" | "inline";
};

export function ExperienceItem({ className, headerLayout = "split", ...item }: ExperienceItemProps) {
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

  const renderInlineHeader = () => {
    // Combine position and location into a single leading cell so the header
    // stays on one line, e.g. "Frontend Engineer (Guangzhou)".
    const hasPosition = Boolean(item.position?.trim());
    const hasLocation = Boolean(item.location?.trim());

    const leading =
      hasPosition || hasLocation ? (
        <span className="section-item-metadata experience-item-position-location">
          {hasPosition && <span className="experience-item-position">{item.position}</span>}
          {hasPosition && hasLocation && " "}
          {hasLocation && <span className="experience-item-location opacity-80">({item.location})</span>}
        </span>
      ) : null;

    const middle = (
      <LinkedTitle
        title={item.company}
        website={item.website}
        showLinkInTitle={item.options?.showLinkInTitle}
        className="section-item-title experience-item-title"
      />
    );

    const trailing = item.period ? (
      <span className="section-item-metadata experience-item-period whitespace-nowrap">{item.period}</span>
    ) : null;

    return <InlineHeader leading={leading} middle={middle} trailing={trailing} />;
  };

  const renderSplitHeader = () => (
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
  );

  return (
    <div className={cn("experience-item", className)}>
      {/* Header */}
      <div className="section-item-header experience-item-header">
        {headerLayout === "inline" ? renderInlineHeader() : renderSplitHeader()}
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
