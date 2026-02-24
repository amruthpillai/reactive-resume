import { AnimatePresence, Reorder } from "motion/react";
import type z from "zod";
import { useResumeStore } from "@/components/resume/store/resume";
import type { projectItemSchema } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function ProjectsSectionBuilder() {
	const section = useResumeStore((state) => state.resume.data.sections.projects);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const handleReorder = (items: z.infer<typeof projectItemSchema>[]) => {
		updateResumeData((draft) => {
			draft.sections.projects.items = items;
		});
	};

	const buildSubtitle = (item: z.infer<typeof projectItemSchema>) => {
		const parts = [item.period, item.website.label].filter((part) => part && part.trim().length > 0);
		return parts.length > 0 ? parts.join(" • ") : undefined;
	};

	return (
		<SectionBase type="projects" className={cn("rounded-md border", section.items.length === 0 && "border-dashed")}>
			<Reorder.Group axis="y" values={section.items} onReorder={handleReorder}>
				<AnimatePresence>
					{section.items.map((item) => (
						<SectionItem key={item.id} type="projects" item={item} title={item.name} subtitle={buildSubtitle(item)} />
					))}
				</AnimatePresence>
			</Reorder.Group>

			<SectionAddItemButton type="projects">
				Add a new project
			</SectionAddItemButton>
		</SectionBase>
	);
}
