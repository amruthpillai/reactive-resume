import type { SectionItem } from "@/schema/resume/data";

import { TiptapContent } from "@/components/input/rich-input";
import { filterFieldValues } from "@/utils/field";
import { stripHtml } from "@/utils/string";
import { cn } from "@/utils/style";

import { LinkedTitle } from "../linked-title";
import { PageLink } from "../page-link";

type ReferencesItemProps = SectionItem<"references"> & {
  className?: string;
};

export function ReferencesItem({ className, ...item }: ReferencesItemProps) {
  const headerValues = {
    name: item.name,
    position: item.position,
  };
  const headerFields = filterFieldValues(
    headerValues,
    {
      key: "name",
      content: (
        <LinkedTitle
          title={item.name}
          website={item.website}
          showLinkInTitle={item.options?.showLinkInTitle}
          className="section-item-title references-item-name"
        />
      ),
    },
    {
      key: "position",
      content: <span className="section-item-metadata references-item-position">{item.position}</span>,
    },
  );

  return (
    <div className={cn("references-item", className)}>
      {/* Header */}
      <div className="section-item-header references-item-header">
        <div className="grid grid-cols-2 items-start gap-x-2">
          {headerFields.map((field, index) => (
            <div key={field.key} className={cn(index % 2 === 1 && "shrink-0 justify-self-end text-end")}>
              {field.content}
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      <div
        className={cn("section-item-description references-item-description", !stripHtml(item.description) && "hidden")}
      >
        <TiptapContent content={item.description} />
      </div>

      {/* Footer */}
      <div className="section-item-footer references-item-footer flex flex-col">
        {/* Row 1 */}
        <span className="section-item-metadata references-item-phone inline-block">{item.phone}</span>

        {/* Row 2 */}
        {!item.options?.showLinkInTitle && (
          <PageLink
            {...item.website}
            label={item.website.label}
            className="section-item-website references-item-website"
          />
        )}
      </div>
    </div>
  );
}
