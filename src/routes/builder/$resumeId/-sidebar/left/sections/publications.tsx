import { AnimatePresence, Reorder } from "motion/react";
import type z from "zod";
import { useResumeStore } from "@/components/resume/store/resume";
import type { publicationItemSchema } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function PublicationsSectionBuilder() {
	const section = useResumeStore((state) => state.resume.data.sections.publications);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const handleReorder = (items: z.infer<typeof publicationItemSchema>[]) => {
		updateResumeData((draft) => {
			draft.sections.publications.items = items;
		});
	};

	return (
		<SectionBase type="publications" className={cn("rounded-md border", section.items.length === 0 && "border-dashed")}>
			<Reorder.Group axis="y" values={section.items} onReorder={handleReorder}>
				<AnimatePresence>
					{section.items.map((item) => (
						<SectionItem key={item.id} type="publications" item={item} title={item.title} subtitle={item.publisher} />
					))}
				</AnimatePresence>
			</Reorder.Group>

			<SectionAddItemButton type="publications">
				Add a new publication
			</SectionAddItemButton>
		</SectionBase>
	);
}
