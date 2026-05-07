import type { interestItemSchema } from "@reactive-resume/schema/resume/data";
import type z from "zod";
import { Trans } from "@lingui/react/macro";
import { AnimatePresence, Reorder } from "motion/react";
import { cn } from "@reactive-resume/utils/style";
import { useCurrentResume, useUpdateResumeData } from "@/components/resume/use-resume";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function InterestsSectionBuilder() {
	const resume = useCurrentResume();
	const section = resume.data.sections.interests;
	const updateResumeData = useUpdateResumeData();

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
				<Trans>Add a new interest</Trans>
			</SectionAddItemButton>
		</SectionBase>
	);
}
