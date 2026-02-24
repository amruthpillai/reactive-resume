import { AnimatePresence, Reorder } from "motion/react";
import type z from "zod";
import { useResumeStore } from "@/components/resume/store/resume";
import type { skillItemSchema } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function SkillsSectionBuilder() {
	const section = useResumeStore((state) => state.resume.data.sections.skills);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const handleReorder = (items: z.infer<typeof skillItemSchema>[]) => {
		updateResumeData((draft) => {
			draft.sections.skills.items = items;
		});
	};

	return (
		<SectionBase type="skills" className={cn("rounded-md border", section.items.length === 0 && "border-dashed")}>
			<Reorder.Group axis="y" values={section.items} onReorder={handleReorder}>
				<AnimatePresence>
					{section.items.map((item) => (
						<SectionItem key={item.id} type="skills" item={item} title={item.name} subtitle={item.proficiency} />
					))}
				</AnimatePresence>
			</Reorder.Group>

			<SectionAddItemButton type="skills">
				Add a new skill
			</SectionAddItemButton>
		</SectionBase>
	);
}
