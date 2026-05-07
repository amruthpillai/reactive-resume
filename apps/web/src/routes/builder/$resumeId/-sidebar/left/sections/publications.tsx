import type { publicationItemSchema } from "@reactive-resume/schema/resume/data";
import type z from "zod";
import { Trans } from "@lingui/react/macro";
import { AnimatePresence, Reorder } from "motion/react";
import { cn } from "@reactive-resume/utils/style";
import { useCurrentResume, useUpdateResumeData } from "@/components/resume/use-resume";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function PublicationsSectionBuilder() {
	const resume = useCurrentResume();
	const section = resume.data.sections.publications;
	const updateResumeData = useUpdateResumeData();

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
				<Trans>Add a new publication</Trans>
			</SectionAddItemButton>
		</SectionBase>
	);
}
