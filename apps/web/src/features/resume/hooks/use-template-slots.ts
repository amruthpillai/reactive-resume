import type { ResumeSlot, ResumeSlotItemType } from "@reactive-resume/schema/template-metadata";
import { useQuery } from "@tanstack/react-query";
import { useResumeData } from "@/features/resume/builder/draft";
import { orpc } from "@/libs/orpc/client";

export function useTemplateSlots(itemType: ResumeSlotItemType): ResumeSlot[] {
	const resumeData = useResumeData();
	const templateId = resumeData?.metadata.template ?? "";

	const { data } = useQuery({
		...orpc.templates.exportTemplate.queryOptions({ input: { id: templateId } }),
		enabled: Boolean(templateId),
		retry: false,
	});

	return (data?.inputs ?? []).filter((slot) => slot.itemType === itemType);
}
