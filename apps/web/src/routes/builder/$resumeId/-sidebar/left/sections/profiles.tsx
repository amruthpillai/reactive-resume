import type { profileItemSchema } from "@reactive-resume/schema/resume/data";
import type z from "zod";
import { Trans } from "@lingui/react/macro";
import { AnimatePresence, Reorder } from "motion/react";
import { cn } from "@reactive-resume/utils/style";
import { useCurrentResume, useUpdateResumeData } from "@/components/resume/use-resume";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function ProfilesSectionBuilder() {
	const resume = useCurrentResume();
	const section = resume.data.sections.profiles;
	const updateResumeData = useUpdateResumeData();

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
				<Trans>Add a new profile</Trans>
			</SectionAddItemButton>
		</SectionBase>
	);
}
