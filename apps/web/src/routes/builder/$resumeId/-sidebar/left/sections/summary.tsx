import { RichInput } from "@/components/input/rich-input";
import { useCurrentResume, useUpdateResumeData } from "@/components/resume/use-resume";
import { SectionBase } from "../shared/section-base";

export function SummarySectionBuilder() {
	const resume = useCurrentResume();
	const section = resume.data.summary;
	const updateResumeData = useUpdateResumeData();

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
