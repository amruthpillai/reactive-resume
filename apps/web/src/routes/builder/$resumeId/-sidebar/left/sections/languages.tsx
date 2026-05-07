import type { languageItemSchema } from "@reactive-resume/schema/resume/data";
import type z from "zod";
import { Trans } from "@lingui/react/macro";
import { AnimatePresence, Reorder } from "motion/react";
import { cn } from "@reactive-resume/utils/style";
import { useCurrentResume, useUpdateResumeData } from "@/components/resume/use-resume";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function LanguagesSectionBuilder() {
	const resume = useCurrentResume();
	const section = resume.data.sections.languages;
	const updateResumeData = useUpdateResumeData();

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
				<Trans>Add a new language</Trans>
			</SectionAddItemButton>
		</SectionBase>
	);
}
