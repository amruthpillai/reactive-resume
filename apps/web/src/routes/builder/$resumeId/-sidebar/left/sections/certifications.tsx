import type { certificationItemSchema } from "@reactive-resume/schema/resume/data";
import type z from "zod";
import { Trans } from "@lingui/react/macro";
import { AnimatePresence, Reorder } from "motion/react";
import { cn } from "@reactive-resume/utils/style";
import { useCurrentResume, useUpdateResumeData } from "@/components/resume/use-resume";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function CertificationsSectionBuilder() {
	const resume = useCurrentResume();
	const section = resume.data.sections.certifications;
	const updateResumeData = useUpdateResumeData();

	const handleReorder = (items: z.infer<typeof certificationItemSchema>[]) => {
		updateResumeData((draft) => {
			draft.sections.certifications.items = items;
		});
	};

	return (
		<SectionBase
			type="certifications"
			className={cn("rounded-md border", section.items.length === 0 && "border-dashed")}
		>
			<Reorder.Group axis="y" values={section.items} onReorder={handleReorder}>
				<AnimatePresence>
					{section.items.map((item) => (
						<SectionItem
							key={item.id}
							type="certifications"
							item={item}
							title={item.title}
							subtitle={[item.issuer, item.date].filter(Boolean).join(" • ") || undefined}
						/>
					))}
				</AnimatePresence>
			</Reorder.Group>

			<SectionAddItemButton type="certifications">
				<Trans>Add a new certification</Trans>
			</SectionAddItemButton>
		</SectionBase>
	);
}
