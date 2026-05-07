import type { educationItemSchema } from "@reactive-resume/schema/resume/data";
import type z from "zod";
import { Trans } from "@lingui/react/macro";
import { AnimatePresence, Reorder } from "motion/react";
import { cn } from "@reactive-resume/utils/style";
import { useCurrentResume, useUpdateResumeData } from "@/components/resume/use-resume";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function EducationSectionBuilder() {
	const resume = useCurrentResume();
	const section = resume.data.sections.education;
	const updateResumeData = useUpdateResumeData();

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
