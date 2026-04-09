import { Fragment, useCallback, useRef } from "react";
import { match } from "ts-pattern";

import { Button } from "@/components/ui/button";
import { Copyright } from "@/components/ui/copyright";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  getSectionIcon,
  getSectionTitle,
  type RightSidebarSection,
  rightSidebarSections,
} from "@/utils/resume/section";

import { BuilderSidebarEdge } from "../../-components/edge";
import { useBuilderSidebar } from "../../-store/sidebar";
import { CSSSectionBuilder } from "./sections/css";
import { DesignSectionBuilder } from "./sections/design";
import { ExportSectionBuilder } from "./sections/export";
import { InformationSectionBuilder } from "./sections/information";
import { LayoutSectionBuilder } from "./sections/layout";
import { NotesSectionBuilder } from "./sections/notes";
import { PageSectionBuilder } from "./sections/page";
import { ResumeAnalysisSectionBuilder } from "./sections/resume-analysis";
import { SharingSectionBuilder } from "./sections/sharing";
import { StatisticsSectionBuilder } from "./sections/statistics";
import { TemplateSectionBuilder } from "./sections/template";
import { TypographySectionBuilder } from "./sections/typography";

function getSectionComponent(type: RightSidebarSection) {
  return match(type)
    .with("template", () => <TemplateSectionBuilder />)
    .with("layout", () => <LayoutSectionBuilder />)
    .with("typography", () => <TypographySectionBuilder />)
    .with("design", () => <DesignSectionBuilder />)
    .with("page", () => <PageSectionBuilder />)
    .with("css", () => <CSSSectionBuilder />)
    .with("notes", () => <NotesSectionBuilder />)
    .with("sharing", () => <SharingSectionBuilder />)
    .with("statistics", () => <StatisticsSectionBuilder />)
    .with("analysis", () => <ResumeAnalysisSectionBuilder />)
    .with("export", () => <ExportSectionBuilder />)
    .with("information", () => <InformationSectionBuilder />)
    .exhaustive();
}

export function BuilderSidebarRight() {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
      <SidebarEdge scrollAreaRef={scrollAreaRef} />

      <ScrollArea
        ref={scrollAreaRef}
        className="@container h-[calc(100svh-3.5rem)] overflow-hidden bg-background sm:me-12"
      >
        <div className="space-y-4 p-4">
          {rightSidebarSections.map((section) => (
            <Fragment key={section}>
              {getSectionComponent(section)}
              <Separator />
            </Fragment>
          ))}

          <Copyright className="mx-auto py-2 text-center" />
        </div>
      </ScrollArea>
    </>
  );
}

type SidebarEdgeProps = {
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
};

function SidebarEdge({ scrollAreaRef }: SidebarEdgeProps) {
  const toggleSidebar = useBuilderSidebar((state) => state.toggleSidebar);

  const scrollToSection = useCallback(
    (section: RightSidebarSection) => {
      if (!scrollAreaRef.current) return;
      toggleSidebar("right", true);

      const sectionElement = scrollAreaRef.current.querySelector(`#sidebar-${section}`);
      sectionElement?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    },
    [toggleSidebar, scrollAreaRef],
  );

  return (
    <BuilderSidebarEdge side="right">
      <div className="no-scrollbar min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto">
        <div className="flex min-h-full flex-col items-center justify-center gap-y-2">
          {rightSidebarSections.map((section) => (
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
    </BuilderSidebarEdge>
  );
}
