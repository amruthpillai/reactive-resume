import type { SectionItem } from "@/schema/resume/data";

import { TiptapContent } from "@/components/input/rich-input";
import { filterFieldValues } from "@/utils/field";
import { stripHtml } from "@/utils/string";
import { cn } from "@/utils/style";

import { LinkedTitle } from "../linked-title";
import { PageLink } from "../page-link";

type CertificationsItemProps = SectionItem<"certifications"> & {
  className?: string;
};

export function CertificationsItem({ className, ...item }: CertificationsItemProps) {
  const headerValues = {
    title: item.title,
    date: item.date,
    issuer: item.issuer,
  };
  const headerFields = filterFieldValues(
    headerValues,
    {
      key: "title",
      content: (
        <LinkedTitle
          title={item.title}
          website={item.website}
          showLinkInTitle={item.options?.showLinkInTitle}
          className="section-item-title certifications-item-title"
        />
      ),
    },
    {
      key: "date",
      content: <span className="section-item-metadata certifications-item-date">{item.date}</span>,
    },
    {
      key: "issuer",
      content: <span className="section-item-metadata certifications-item-issuer">{item.issuer}</span>,
    },
  );

  return (
    <div className={cn("certifications-item", className)}>
      {/* Header */}
      <div className="section-item-header certifications-item-header">
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
