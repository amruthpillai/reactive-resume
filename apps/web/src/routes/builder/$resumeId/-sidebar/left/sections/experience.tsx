import type { experienceItemSchema } from "@reactive-resume/schema/resume/data";
import type z from "zod";
import { plural } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { AnimatePresence, Reorder } from "motion/react";
import { cn } from "@reactive-resume/utils/style";
import { useCurrentResume, useUpdateResumeData } from "@/components/resume/use-resume";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function ExperienceSectionBuilder() {
	const resume = useCurrentResume();
	const section = resume.data.sections.experience;
	const updateResumeData = useUpdateResumeData();

	const handleReorder = (items: z.infer<typeof experienceItemSchema>[]) => {
		updateResumeData((draft) => {
			draft.sections.experience.items = items;
		});
	};

	return (
		<SectionBase type="experience" className={cn("rounded-md border", section.items.length === 0 && "border-dashed")}>
			<Reorder.Group axis="y" values={section.items} onReorder={handleReorder}>
				<AnimatePresence initial={false} mode="popLayout">
					{section.items.map((item) => {
						return (
							<SectionItem
								key={item.id}
								type="experience"
								item={item}
								title={item.company}
								subtitle={item.position || plural(item.roles.length, { one: "# role", other: "# roles" })}
							/>
						);
					})}
				</AnimatePresence>
			</Reorder.Group>

			<SectionAddItemButton type="experience">
				<Trans>Add a new experience</Trans>
			</SectionAddItemButton>
		</SectionBase>
	);
}
