import { AnimatePresence, Reorder } from "motion/react";
import type z from "zod";
import { useResumeStore } from "@/components/resume/store/resume";
import type { referenceItemSchema } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function ReferencesSectionBuilder() {
	const section = useResumeStore((state) => state.resume.data.sections.references);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const handleReorder = (items: z.infer<typeof referenceItemSchema>[]) => {
		updateResumeData((draft) => {
			draft.sections.references.items = items;
		});
	};

	return (
		<SectionBase type="references" className={cn("rounded-md border", section.items.length === 0 && "border-dashed")}>
			<Reorder.Group axis="y" values={section.items} onReorder={handleReorder}>
				<AnimatePresence>
					{section.items.map((item) => (
						<SectionItem key={item.id} type="references" item={item} title={item.name} />
					))}
				</AnimatePresence>
			</Reorder.Group>

			<SectionAddItemButton type="references">
				Add a new reference
			</SectionAddItemButton>
		</SectionBase>
	);
}
