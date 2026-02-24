import { AnimatePresence, Reorder } from "motion/react";
import type z from "zod";
import { useResumeStore } from "@/components/resume/store/resume";
import type { languageItemSchema } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function LanguagesSectionBuilder() {
	const section = useResumeStore((state) => state.resume.data.sections.languages);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const handleReorder = (items: z.infer<typeof languageItemSchema>[]) => {
		updateResumeData((draft) => {
			draft.sections.languages.items = items;
		});
	};

	return (
		<SectionBase type="languages" className={cn("rounded-md border", section.items.length === 0 && "border-dashed")}>
			<Reorder.Group axis="y" values={section.items} onReorder={handleReorder}>
				<AnimatePresence>
					{section.items.map((item) => (
						<SectionItem key={item.id} type="languages" item={item} title={item.language} subtitle={item.fluency} />
					))}
				</AnimatePresence>
			</Reorder.Group>

			<SectionAddItemButton type="languages">
				Add a new language
			</SectionAddItemButton>
		</SectionBase>
	);
}
