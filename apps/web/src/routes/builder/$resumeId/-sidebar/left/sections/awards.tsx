import type { awardItemSchema } from "@reactive-resume/schema/resume/data";
import type z from "zod";
import { Trans } from "@lingui/react/macro";
import { AnimatePresence, Reorder } from "motion/react";
import { cn } from "@reactive-resume/utils/style";
import { useCurrentResume, useUpdateResumeData } from "@/components/resume/use-resume";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function AwardsSectionBuilder() {
	const resume = useCurrentResume();
	const section = resume.data.sections.awards;
	const updateResumeData = useUpdateResumeData();

	const handleReorder = (items: z.infer<typeof awardItemSchema>[]) => {
		updateResumeData((draft) => {
			draft.sections.awards.items = items;
		});
	};

	return (
		<SectionBase type="awards" className={cn("rounded-md border", section.items.length === 0 && "border-dashed")}>
			<Reorder.Group axis="y" values={section.items} onReorder={handleReorder}>
				<AnimatePresence>
					{section.items.map((item) => (
						<SectionItem key={item.id} type="awards" item={item} title={item.title} subtitle={item.awarder} />
					))}
				</AnimatePresence>
			</Reorder.Group>

			<SectionAddItemButton type="awards">
				<Trans>Add a new award</Trans>
			</SectionAddItemButton>
		</SectionBase>
	);
}
