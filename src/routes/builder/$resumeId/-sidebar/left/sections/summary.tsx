import { RichInput } from "@/components/input/rich-input";
import { useResumeStore } from "@/components/resume/store/resume";

import { SectionBase } from "../shared/section-base";

export function SummarySectionBuilder() {
	const section = useResumeStore((state) => state.resume.data.summary);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const onChange = (value: string) => {
		updateResumeData((draft) => {
			draft.summary.content = value;
		});
	};

	return (
		<SectionBase type="summary">
			<RichInput value={section.content} onChange={onChange} />
		</SectionBase>
	);
}
