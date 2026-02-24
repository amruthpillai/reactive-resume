import { AnimatePresence, Reorder } from "motion/react";
import type z from "zod";
import { useResumeStore } from "@/components/resume/store/resume";
import type { interestItemSchema } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function InterestsSectionBuilder() {
	const section = useResumeStore((state) => state.resume.data.sections.interests);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const handleReorder = (items: z.infer<typeof interestItemSchema>[]) => {
		updateResumeData((draft) => {
			draft.sections.interests.items = items;
		});
	};

	return (
		<SectionBase type="interests" className={cn("rounded-md border", section.items.length === 0 && "border-dashed")}>
			<Reorder.Group axis="y" values={section.items} onReorder={handleReorder}>
				<AnimatePresence>
					{section.items.map((item) => (
						<SectionItem key={item.id} type="interests" item={item} title={item.name} />
					))}
				</AnimatePresence>
			</Reorder.Group>

			<SectionAddItemButton type="interests">
				Add a new interest
			</SectionAddItemButton>
		</SectionBase>
	);
}
