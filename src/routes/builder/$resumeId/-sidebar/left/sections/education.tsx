import type z from "zod";

import { Trans } from "@lingui/react/macro";
import { AnimatePresence, Reorder } from "motion/react";

import type { educationItemSchema } from "@/schema/resume/data";

import { useResumeStore } from "@/components/resume/store/resume";
import { cn } from "@/utils/style";

import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function EducationSectionBuilder() {
  const section = useResumeStore((state) => state.resume.data.sections.education);
  const updateResumeData = useResumeStore((state) => state.updateResumeData);

  const handleReorder = (items: z.infer<typeof educationItemSchema>[]) => {
    updateResumeData((draft) => {
      draft.sections.education.items = items;
    });
  };

  return (
    <SectionBase type="education" className={cn("rounded-md border", section.items.length === 0 && "border-dashed")}>
      <Reorder.Group axis="y" values={section.items} onReorder={handleReorder}>
        <AnimatePresence>
          {section.items.map((item) => (
            <SectionItem key={item.id} type="education" item={item} title={item.school} subtitle={item.degree} />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      <SectionAddItemButton type="education">
        <Trans>Add a new education</Trans>
      </SectionAddItemButton>
    </SectionBase>
  );
}
