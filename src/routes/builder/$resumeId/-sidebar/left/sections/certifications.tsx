import { AnimatePresence, Reorder } from "motion/react";
import type z from "zod";
import { useResumeStore } from "@/components/resume/store/resume";
import type { certificationItemSchema } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

export function CertificationsSectionBuilder() {
	const section = useResumeStore((state) => state.resume.data.sections.certifications);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

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
				Add a new certification
			</SectionAddItemButton>
		</SectionBase>
	);
}
