import type { SectionItem } from "@/schema/resume/data";

import { TiptapContent } from "@/components/input/rich-input";
import { filterFieldValues } from "@/utils/field";
import { stripHtml } from "@/utils/string";
import { cn } from "@/utils/style";

import { InlineHeader } from "../inline-header";
import { LinkedTitle } from "../linked-title";
import { PageLink } from "../page-link";

type VolunteerItemProps = SectionItem<"volunteer"> & {
  className?: string;
  /**
   * Controls the header layout of each entry.
   * - `"split"` (default): two-column layout — organization/location on the
   *   start side, period on the end side.
   * - `"inline"`: single-row, three-column layout — `[role (location)]`,
   *   `[organization]`, `[period]`. Used by templates targeting compact
   *   single-line entry headers (e.g., Asian resume conventions).
   *
   * Note: The volunteer schema doesn't have a dedicated "role" field; when
   * inline layout is requested, the leading column falls back to the location.
   */
  headerLayout?: "split" | "inline";
};

export function VolunteerItem({ className, headerLayout = "split", ...item }: VolunteerItemProps) {
  const headerValues = {
    organization: item.organization,
    period: item.period,
    location: item.location,
  };
  const headerFields = filterFieldValues(
    headerValues,
    {
      key: "organization",
      content: (
        <LinkedTitle
          title={item.organization}
          website={item.website}
          showLinkInTitle={item.options?.showLinkInTitle}
          className="section-item-title volunteer-item-title"
        />
      ),
    },
    {
      key: "period",
      content: <span className="section-item-metadata volunteer-item-period">{item.period}</span>,
    },
    {
      key: "location",
      content: <span className="section-item-metadata volunteer-item-location">{item.location}</span>,
    },
  );

  const renderInlineHeader = () => (
    <InlineHeader
      leading={headerFields.get("location")?.content}
      middle={headerFields.get("organization")?.content}
      trailing={headerFields.get("period")?.content}
    />
  );

  const renderSplitHeader = () => (
    <div className="flex items-start justify-between gap-x-2">
      <div className="flex min-w-0 flex-1 flex-col items-start">
        {headerFields.get("organization")?.content}
        {headerFields.get("location")?.content}
      </div>

      <div className="flex min-w-0 shrink-0 flex-col items-end text-end">{headerFields.get("period")?.content}</div>
    </div>
  );

  return (
    <div className={cn("volunteer-item", className)}>
      {/* Header */}
      <div className="section-item-header volunteer-item-header">
        {headerLayout === "inline" ? renderInlineHeader() : renderSplitHeader()}
      </div>

      {/* Description */}
      <div
        className={cn("section-item-description volunteer-item-description", !stripHtml(item.description) && "hidden")}
      >
        <TiptapContent content={item.description} />
      </div>

      {/* Website */}
      {!item.options?.showLinkInTitle && (
        <div className="section-item-website volunteer-item-website">
          <PageLink {...item.website} label={item.website.label} />
        </div>
      )}
    </div>
  );
}
