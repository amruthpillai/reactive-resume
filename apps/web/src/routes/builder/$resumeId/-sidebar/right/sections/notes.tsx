import { Trans } from "@lingui/react/macro";
import { RichInput } from "@/components/input/rich-input";
import { useCurrentResume, useUpdateResumeData } from "@/features/resume/builder/draft";
import { SectionBase } from "../shared/section-base";

export function NotesSectionBuilder() {
	return (
		<SectionBase type="notes">
			<NotesSectionForm />
		</SectionBase>
	);
}

function NotesSectionForm() {
	const resume = useCurrentResume();
	const notes = resume.data.metadata.notes;
	const updateResumeData = useUpdateResumeData();

	const onChange = (value: string) => {
		updateResumeData((draft) => {
			draft.metadata.notes = value;
		});
	};

	return (
		<div className="space-y-4">
			<p>
				<Trans>Keep private notes about this resume here. Nobody else can see them.</Trans>
			</p>

			<RichInput value={notes} onChange={onChange} />

			<p className="text-muted-foreground">
				<Trans>For example, note which companies you sent this resume to, or links to the job descriptions.</Trans>
			</p>
		</div>
	);
}
