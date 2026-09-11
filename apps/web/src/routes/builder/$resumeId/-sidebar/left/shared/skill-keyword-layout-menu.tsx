import { Trans } from "@lingui/react/macro";
import { ListIcon } from "@phosphor-icons/react";
import {
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { useCurrentResume, useUpdateResumeData } from "@/features/resume/builder/draft";

type SkillKeywordLayoutMenuProps = { sectionId?: string };

export function SkillKeywordLayoutMenu({ sectionId }: SkillKeywordLayoutMenuProps) {
	const resume = useCurrentResume();
	const updateResumeData = useUpdateResumeData();
	const section = sectionId
		? resume.data.customSections.find((section) => section.id === sectionId && section.type === "skills")
		: resume.data.sections.skills;
	if (!section) return null;

	return (
		<DropdownMenuSub>
			<DropdownMenuSubTrigger disabled={resume.isLocked}>
				<ListIcon />
				<Trans>Keyword layout</Trans>
			</DropdownMenuSubTrigger>
			<DropdownMenuSubContent>
				<DropdownMenuRadioGroup
					value={section.keywordLayout ?? "inline"}
					onValueChange={(value) => {
						if (value !== "inline" && value !== "list") return;
						updateResumeData((draft) => {
							const target = sectionId
								? draft.customSections.find((section) => section.id === sectionId && section.type === "skills")
								: draft.sections.skills;
							if (target) target.keywordLayout = value;
						});
					}}
				>
					<DropdownMenuRadioItem value="inline">
						<Trans>Inline</Trans>
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="list">
						<Trans>Bulleted list</Trans>
					</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuSubContent>
		</DropdownMenuSub>
	);
}
