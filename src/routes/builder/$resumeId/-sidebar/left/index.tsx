import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { Fragment, useCallback, useRef } from "react";
import { match } from "ts-pattern";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { UserDropdownMenu } from "@/components/user/dropdown-menu";
import { getSectionIcon, getSectionTitle, type LeftSidebarSection, leftSidebarSections } from "@/utils/resume/section";
import { getInitials } from "@/utils/string";

import { BuilderSidebarEdge } from "../../-components/edge";
import { useSectionStore } from "../../-store/section";
import { useBuilderSidebar } from "../../-store/sidebar";
import { AwardsSectionBuilder } from "./sections/awards";
import { BasicsSectionBuilder } from "./sections/basics";
import { CertificationsSectionBuilder } from "./sections/certifications";
import { CustomSectionBuilder } from "./sections/custom";
import { EducationSectionBuilder } from "./sections/education";
import { ExperienceSectionBuilder } from "./sections/experience";
import { InterestsSectionBuilder } from "./sections/interests";
import { LanguagesSectionBuilder } from "./sections/languages";
import { PictureSectionBuilder } from "./sections/picture";
import { ProfilesSectionBuilder } from "./sections/profiles";
import { ProjectsSectionBuilder } from "./sections/projects";
import { PublicationsSectionBuilder } from "./sections/publications";
import { ReferencesSectionBuilder } from "./sections/references";
import { SkillsSectionBuilder } from "./sections/skills";
import { SummarySectionBuilder } from "./sections/summary";
import { VolunteerSectionBuilder } from "./sections/volunteer";

function getSectionComponent(type: LeftSidebarSection) {
  return match(type)
    .with("picture", () => <PictureSectionBuilder />)
    .with("basics", () => <BasicsSectionBuilder />)
    .with("summary", () => <SummarySectionBuilder />)
    .with("profiles", () => <ProfilesSectionBuilder />)
    .with("experience", () => <ExperienceSectionBuilder />)
    .with("education", () => <EducationSectionBuilder />)
    .with("projects", () => <ProjectsSectionBuilder />)
    .with("skills", () => <SkillsSectionBuilder />)
    .with("languages", () => <LanguagesSectionBuilder />)
    .with("interests", () => <InterestsSectionBuilder />)
    .with("awards", () => <AwardsSectionBuilder />)
    .with("certifications", () => <CertificationsSectionBuilder />)
    .with("publications", () => <PublicationsSectionBuilder />)
    .with("volunteer", () => <VolunteerSectionBuilder />)
    .with("references", () => <ReferencesSectionBuilder />)
    .with("custom", () => <CustomSectionBuilder />)
    .exhaustive();
}

export function BuilderSidebarLeft() {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const sections = useSectionStore((state) => state.sections);
  const setHidden = useSectionStore((state) => state.setHidden);

  const visibleSections = leftSidebarSections.filter((section) => !sections[section]?.hidden);
  const hiddenSections = leftSidebarSections.filter((section) => sections[section]?.hidden);

  return (
    <>
      <SidebarEdge scrollAreaRef={scrollAreaRef} sections={visibleSections} />

      <ScrollArea ref={scrollAreaRef} className="@container h-[calc(100svh-3.5rem)] bg-background sm:ms-12">
        <div className="space-y-4 p-4">
          {visibleSections.map((section, index) => (
            <Fragment key={section}>
              {getSectionComponent(section)}
              {index < visibleSections.length - 1 && <Separator />}
            </Fragment>
          ))}

          {hiddenSections.length > 0 && (
            <>
              {visibleSections.length > 0 && <Separator />}

              <HiddenSectionsPanel
                sections={hiddenSections}
                onShowSection={(section) => setHidden(section, false)}
                onShowAll={() => hiddenSections.forEach((section) => setHidden(section, false))}
              />
            </>
          )}
        </div>
      </ScrollArea>
    </>
  );
}

type HiddenSectionsPanelProps = {
  sections: LeftSidebarSection[];
  onShowSection: (section: LeftSidebarSection) => void;
  onShowAll: () => void;
};

function HiddenSectionsPanel({ sections, onShowSection, onShowAll }: HiddenSectionsPanelProps) {
  return (
    <div className="rounded-md border border-dashed border-border/70 bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-x-2">
        <div className="flex items-center gap-x-2 text-sm font-medium text-muted-foreground">
          <EyeSlashIcon className="size-4" />
          <span>
            <Trans>Hidden in sidebar</Trans>
          </span>
        </div>

        <Button size="sm" variant="ghost" type="button" onClick={onShowAll} title={t`Show all sections`}>
          <Trans>Show all</Trans>
        </Button>
      </div>

      <div className="space-y-1">
        {sections.map((section) => (
          <Button
            key={section}
            className="h-auto w-full justify-start gap-x-2 px-2 py-2 text-left"
            size="sm"
            type="button"
            variant="ghost"
            title={t`Show in sidebar`}
            aria-label={t`Show in sidebar`}
            onClick={() => onShowSection(section)}
          >
            {getSectionIcon(section)}
            <span className="truncate">{getSectionTitle(section)}</span>
            <EyeIcon className="ms-auto" />
          </Button>
        ))}
      </div>
    </div>
  );
}

type SidebarEdgeProps = {
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  sections: LeftSidebarSection[];
};

function SidebarEdge({ scrollAreaRef, sections }: SidebarEdgeProps) {
  const toggleSidebar = useBuilderSidebar((state) => state.toggleSidebar);

  const scrollToSection = useCallback(
    (section: LeftSidebarSection) => {
      if (!scrollAreaRef.current) return;
      toggleSidebar("left", true);

      const sectionElement = scrollAreaRef.current.querySelector(`#sidebar-${section}`);
      sectionElement?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    },
    [toggleSidebar, scrollAreaRef],
  );

  return (
    <BuilderSidebarEdge side="left">
      <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-y-2 overflow-hidden">
        <div className="no-scrollbar min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto">
          <div className="flex min-h-full flex-col items-center justify-center gap-y-2">
            {sections.map((section) => (
              <Button
                key={section}
                size="icon"
                variant="ghost"
                title={getSectionTitle(section)}
                onClick={() => scrollToSection(section)}
              >
                {getSectionIcon(section)}
              </Button>
            ))}
          </div>
        </div>

        <UserDropdownMenu>
          {({ session }) => (
            <Button size="icon" variant="ghost">
              <Avatar className="size-6">
                <AvatarImage src={session.user.image ?? undefined} />
                <AvatarFallback className="text-[0.5rem]">{getInitials(session.user.name)}</AvatarFallback>
              </Avatar>
            </Button>
          )}
        </UserDropdownMenu>
      </div>
    </BuilderSidebarEdge>
  );
}
