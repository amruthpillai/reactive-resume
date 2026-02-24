import { RichInput } from "@/components/input/rich-input";
import { useResumeStore } from "@/components/resume/store/resume";
import { SectionBase } from "../shared/section-base";

export function NotesSectionBuilder() {
	return (
		<SectionBase type="notes">
			<NotesSectionForm />
		</SectionBase>
	);
}

function NotesSectionForm() {
	const notes = useResumeStore((state) => state.resume.data.metadata.notes);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const onChange = (value: string) => {
		updateResumeData((draft) => {
			draft.metadata.notes = value;
		});
	};

	return (
		<div className="space-y-4">
			<p>
				This section is reserved for your personal notes specific to this resume. The content here remains private and
					is not shared with anyone else.
			</p>

			<RichInput value={notes} onChange={onChange} />

			<p className="text-muted-foreground">
				For example, information regarding which companies you sent this resume to or the links to the job
					descriptions can be noted down here.
			</p>
		</div>
	);
}
