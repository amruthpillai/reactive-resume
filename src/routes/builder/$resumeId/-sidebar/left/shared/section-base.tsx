import { t } from "@lingui/core/macro";
import { CaretDownIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";

import type { SectionType } from "@/schema/resume/data";

import { useResumeStore } from "@/components/resume/store/resume";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { getSectionIcon, getSectionTitle, type LeftSidebarSection } from "@/utils/resume/section";
import { cn } from "@/utils/style";

import { useSectionStore } from "../../../-store/section";
import { SectionDropdownMenu } from "./section-menu";

type Props = React.ComponentProps<typeof AccordionContent> & {
  type: LeftSidebarSection;
};

export function SectionBase({ type, className, ...props }: Props) {
  const section = useResumeStore((state) => {
    if (type === "basics") return state.resume.data.basics;
    if (type === "summary") return state.resume.data.summary;
    if (type === "picture") return state.resume.data.picture;
    if (type === "custom") return state.resume.data.customSections;
    return state.resume.data.sections[type];
  });

  const collapsed = useSectionStore((state) => state.sections[type]?.collapsed ?? false);
  const isSidebarHidden = useSectionStore((state) => state.sections[type]?.hidden ?? false);
  const toggleCollapsed = useSectionStore((state) => state.toggleCollapsed);
  const toggleHidden = useSectionStore((state) => state.toggleHidden);

  return (
    <Accordion
      id={`sidebar-${type}`}
      value={collapsed ? [] : [type]}
      onValueChange={() => toggleCollapsed(type)}
      className="space-y-4"
    >
      <AccordionItem value={type} className="group/accordion-item space-y-4">
        <div className="flex items-center">
          <AccordionTrigger
            className="me-2 items-center justify-center"
            render={
              <Button size="icon" variant="ghost">
                <CaretDownIcon className="transition-transform duration-200 group-data-closed/accordion-item:-rotate-90" />
              </Button>
            }
          />

          <div className="flex flex-1 items-center gap-x-4">
            {getSectionIcon(type)}
            <h2 className="line-clamp-1 text-2xl font-bold tracking-tight">
              {("title" in section && section.title) || getSectionTitle(type)}
            </h2>
          </div>

          <Button
            size="icon"
            variant="ghost"
            type="button"
            title={isSidebarHidden ? t`Show in sidebar` : t`Hide from sidebar`}
            aria-label={isSidebarHidden ? t`Show in sidebar` : t`Hide from sidebar`}
            onClick={() => toggleHidden(type)}
          >
            {isSidebarHidden ? <EyeIcon /> : <EyeSlashIcon />}
          </Button>

          {!["picture", "basics", "custom"].includes(type) && (
            <SectionDropdownMenu type={type as "summary" | SectionType} />
          )}
        </div>

        <AccordionContent
          className={cn(
            "p-0 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
            className,
          )}
          {...props}
        />
      </AccordionItem>
    </Accordion>
  );
}
