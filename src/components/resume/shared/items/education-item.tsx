import type { SectionItem } from "@/schema/resume/data";

import { TiptapContent } from "@/components/input/rich-input";
import { filterFieldValues } from "@/utils/field";
import { stripHtml } from "@/utils/string";
import { cn } from "@/utils/style";

import { InlineHeader } from "../inline-header";
import { LinkedTitle } from "../linked-title";
import { PageLink } from "../page-link";

type EducationItemProps = SectionItem<"education"> & {
  className?: string;
  /**
   * Controls the header layout of each entry.
   * - `"split"` (default): two-column layout — school/area on the start side,
   *   degree/location-period on the end side.
   * - `"inline"`: single-row, three-column layout — `[area (degree · grade)]`,
   *   `[school]`, `[period]`. Used by templates targeting compact single-line
   *   entry headers (e.g., Asian resume conventions).
   */
  headerLayout?: "split" | "inline";
};

export function EducationItem({ className, headerLayout = "split", ...item }: EducationItemProps) {
  const degreeAndGrade = [item.degree, item.grade].filter(Boolean).join(" • ");
  const locationAndPeriod = [item.location, item.period].filter(Boolean).join(" • ");
  const headerValues = {
    school: item.school,
    degreeAndGrade,
    area: item.area,
    locationAndPeriod,
  };
  const headerFields = filterFieldValues(
    headerValues,
    {
      key: "school",
      content: (
        <LinkedTitle
          title={item.school}
          website={item.website}
          showLinkInTitle={item.options?.showLinkInTitle}
          className="section-item-title education-item-title"
        />
      ),
    },
    {
      key: "degreeAndGrade",
      content: <span className="section-item-metadata education-item-degree-grade">{degreeAndGrade}</span>,
    },
    {
      key: "area",
      content: <span className="section-item-metadata education-item-area">{item.area}</span>,
    },
    {
      key: "locationAndPeriod",
      content: <span className="section-item-metadata education-item-location-period">{locationAndPeriod}</span>,
    },
  );

  const renderInlineHeader = () => {
    // Leading cell keeps the header on a single line by only combining the
    // two most essential fields: major (`area`) and degree. Grade and location
    // are demoted to a secondary metadata line below the header so they don't
    // force the header row to wrap on narrow grids.
    const hasArea = Boolean(item.area?.trim());
    const hasDegree = Boolean(item.degree?.trim());

    const leading =
      hasArea || hasDegree ? (
        <span className="section-item-metadata education-item-area-degree">
          {hasArea && <span className="education-item-area">{item.area}</span>}
          {hasArea && hasDegree && " "}
          {hasDegree && <span className="education-item-degree opacity-80">({item.degree})</span>}
        </span>
      ) : null;

    const middle = (
      <LinkedTitle
        title={item.school}
        website={item.website}
        showLinkInTitle={item.options?.showLinkInTitle}
        className="section-item-title education-item-title"
      />
    );

    const trailing = item.period ? (
      <span className="section-item-metadata education-item-period whitespace-nowrap">{item.period}</span>
    ) : null;

    // Secondary line below the header: grade · location (when either exists).
    // Mirrors the "degree · grade / location · period" pairing used by the
    // default split layout, but fitted for a single-column template.
    const gradeAndLocation = [item.grade, item.location].filter(Boolean).join(" • ");

    return (
      <>
        <InlineHeader leading={leading} middle={middle} trailing={trailing} />
        {gradeAndLocation && (
          <div className="section-item-metadata education-item-grade-location mt-0.5 opacity-80">
            {gradeAndLocation}
          </div>
        )}
      </>
    );
  };

  const renderSplitHeader = () => (
    <div className="flex items-start justify-between gap-x-2">
      <div className="flex min-w-0 flex-1 flex-col items-start">
        {headerFields.get("school")?.content}
        {headerFields.get("area")?.content}
      </div>

      <div className="flex min-w-0 shrink-0 flex-col items-end text-end">
        {headerFields.get("degreeAndGrade")?.content}
        {headerFields.get("locationAndPeriod")?.content}
      </div>
    </div>
  );

  return (
    <div className={cn("education-item", className)}>
      {/* Header */}
      <div className="section-item-header education-item-header mb-2">
        {headerLayout === "inline" ? renderInlineHeader() : renderSplitHeader()}
      </div>

      {/* Description */}
      <div
        className={cn("section-item-description education-item-description", !stripHtml(item.description) && "hidden")}
      >
        <TiptapContent content={item.description} />
      </div>

      {/* Website */}
      {!item.options?.showLinkInTitle && (
        <div className="section-item-website education-item-website">
          <PageLink {...item.website} label={item.website.label} />
        </div>
      )}
    </div>
  );
}
