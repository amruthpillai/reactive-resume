import type { volunteerItemSchema } from "@reactive-resume/schema/resume/data";
import type z from "zod";
import { Trans } from "@lingui/react/macro";
import { AnimatePresence, Reorder } from "motion/react";
import { cn } from "@reactive-resume/utils/style";
import { useCurrentResume, useUpdateResumeData } from "@/components/resume/use-resume";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function VolunteerSectionBuilder() {
	const resume = useCurrentResume();
	const section = resume.data.sections.volunteer;
	const updateResumeData = useUpdateResumeData();

	const handleReorder = (items: z.infer<typeof volunteerItemSchema>[]) => {
		updateResumeData((draft) => {
			draft.sections.volunteer.items = items;
		});
	};

	return (
		<SectionBase type="volunteer" className={cn("rounded-md border", section.items.length === 0 && "border-dashed")}>
			<Reorder.Group axis="y" values={section.items} onReorder={handleReorder}>
				<AnimatePresence>
					{section.items.map((item) => (
						<SectionItem
							key={item.id}
							type="volunteer"
							item={item}
							title={item.organization}
							subtitle={item.location}
						/>
					))}
				</AnimatePresence>
			</Reorder.Group>

			<SectionAddItemButton type="volunteer">
				<Trans>Add a new volunteer experience</Trans>
			</SectionAddItemButton>
		</SectionBase>
	);
}
