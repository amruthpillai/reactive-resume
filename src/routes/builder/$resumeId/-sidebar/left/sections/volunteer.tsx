import { AnimatePresence, Reorder } from "motion/react";
import type z from "zod";
import { useResumeStore } from "@/components/resume/store/resume";
import type { volunteerItemSchema } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function VolunteerSectionBuilder() {
	const section = useResumeStore((state) => state.resume.data.sections.volunteer);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

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
				Add a new volunteer experience
			</SectionAddItemButton>
		</SectionBase>
	);
}
