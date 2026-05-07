import { Trans } from "@lingui/react/macro";
import { RichInput } from "@/components/input/rich-input";
import { useCurrentResume, useUpdateResumeData } from "@/components/resume/use-resume";
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
				<Trans>
					This section is reserved for your personal notes specific to this resume. The content here remains private and
					is not shared with anyone else.
				</Trans>
			</p>

			<RichInput value={notes} onChange={onChange} />

			<p className="text-muted-foreground">
				<Trans>
					For example, information regarding which companies you sent this resume to or the links to the job
					descriptions can be noted down here.
				</Trans>
			</p>
		</div>
	);
}
