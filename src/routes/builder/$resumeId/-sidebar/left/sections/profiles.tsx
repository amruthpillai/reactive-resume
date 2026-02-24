import { AnimatePresence, Reorder } from "motion/react";
import type z from "zod";
import { useResumeStore } from "@/components/resume/store/resume";
import type { profileItemSchema } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function ProfilesSectionBuilder() {
	const section = useResumeStore((state) => state.resume.data.sections.profiles);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const handleReorder = (items: z.infer<typeof profileItemSchema>[]) => {
		updateResumeData((draft) => {
			draft.sections.profiles.items = items;
		});
	};

	return (
		<SectionBase type="profiles" className={cn("rounded-md border", section.items.length === 0 && "border-dashed")}>
			<Reorder.Group axis="y" values={section.items} onReorder={handleReorder}>
				<AnimatePresence>
					{section.items.map((item) => (
						<SectionItem key={item.id} type="profiles" item={item} title={item.network} subtitle={item.username} />
					))}
				</AnimatePresence>
			</Reorder.Group>

			<SectionAddItemButton type="profiles">
				Add a new profile
			</SectionAddItemButton>
		</SectionBase>
	);
}
