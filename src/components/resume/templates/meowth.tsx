import { EnvelopeIcon, GlobeIcon, MapPinIcon, PhoneIcon } from "@phosphor-icons/react";

import { cn } from "@/utils/style";

import type { TemplateProps } from "./types";

import { getSectionComponent } from "../shared/get-section-component";
import { PageIcon } from "../shared/page-icon";
import { PageLink } from "../shared/page-link";
import { PagePicture } from "../shared/page-picture";
import { useResumeStore } from "../store/resume";

// Section headings: uppercase, tracked, with a thin primary-colored underline.
// Kept ATS-friendly (plain text, no sidebar decoration).
const sectionClassName = cn(
  "[&>h6]:mb-1 [&>h6]:border-b [&>h6]:border-(--page-primary-color) [&>h6]:pb-0.5",
  "[&>h6]:tracking-wide [&>h6]:text-(--page-primary-color) [&>h6]:uppercase",
);

// Opt-in to the inline three-column header for experience / education / volunteer items.
const itemProps = { headerLayout: "inline" } as const;

/**
 * Template: Meowth
 *
 * A single-column, ATS-friendly template with an inline three-column entry
 * header (position/major · organization · period), optimized for Asian
 * (Chinese / Japanese / Korean) resume conventions where these three
 * fields traditionally share a single line per entry.
 */
export function MeowthTemplate({ pageIndex, pageLayout }: TemplateProps) {
  const isFirstPage = pageIndex === 0;
  const { main, sidebar, fullWidth } = pageLayout;

  return (
    <div className="template-meowth page-content space-y-(--page-gap-y) px-(--page-margin-x) pt-(--page-margin-y) print:p-0">
      {isFirstPage && <Header />}

      <main data-layout="main" className="group page-main space-y-(--page-gap-y)">
        {main.map((section) => {
          const Component = getSectionComponent(section, { sectionClassName, itemProps });
          return <Component key={section} id={section} />;
        })}
      </main>

      {!fullWidth && (
        <aside data-layout="sidebar" className="group page-sidebar space-y-(--page-gap-y)">
          {sidebar.map((section) => {
            const Component = getSectionComponent(section, { sectionClassName, itemProps });
            return <Component key={section} id={section} />;
          })}
        </aside>
      )}
    </div>
  );
}

function Header() {
  const basics = useResumeStore((state) => state.resume.data.basics);

  return (
    <div className="page-header flex items-start gap-x-4">
      <div className="page-basics flex min-w-0 flex-1 flex-col gap-y-2">
        <div>
          <h2 className="basics-name">{basics.name}</h2>
          <p className="basics-headline opacity-80">{basics.headline}</p>
        </div>

        <div className="basics-items flex flex-wrap gap-x-3 gap-y-0.5 *:flex *:items-center *:gap-x-1.5">
          {basics.email && (
            <div className="basics-item-email">
              <EnvelopeIcon />
              <PageLink url={`mailto:${basics.email}`} label={basics.email} />
            </div>
          )}

          {basics.phone && (
            <div className="basics-item-phone">
              <PhoneIcon />
              <PageLink url={`tel:${basics.phone}`} label={basics.phone} />
            </div>
          )}

          {basics.location && (
            <div className="basics-item-location">
              <MapPinIcon />
              <span>{basics.location}</span>
            </div>
          )}

          {basics.website.url && (
            <div className="basics-item-website">
              <GlobeIcon />
              <PageLink {...basics.website} />
            </div>
          )}

          {basics.customFields.map((field) => (
            <div key={field.id} className="basics-item-custom">
              <PageIcon icon={field.icon} />
              {field.link ? <PageLink url={field.link} label={field.text} /> : <span>{field.text}</span>}
            </div>
          ))}
        </div>
      </div>

      <PagePicture />
    </div>
  );
}
