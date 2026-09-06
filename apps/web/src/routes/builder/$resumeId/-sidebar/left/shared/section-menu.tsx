import type { SectionType } from "@reactive-resume/schema/resume/data";
import { t } from "@lingui/core/macro";
import { Plural, Trans } from "@lingui/react/macro";
import {
	BroomIcon,
	ColumnsIcon,
	EyeClosedIcon,
	EyeIcon,
	ListIcon,
	PencilSimpleLineIcon,
	PlusIcon,
	SortDescendingIcon,
} from "@phosphor-icons/react";
import { sortSectionItemsByPeriod } from "@reactive-resume/resume/section-sort";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { toast } from "@reactive-resume/ui/components/toast";
import { useDialogStore } from "@/dialogs/store";
import { useCurrentResume, useUpdateResumeData } from "@/features/resume/builder/draft";
import { useConfirm } from "@/hooks/use-confirm";
import { usePrompt } from "@/hooks/use-prompt";

type Props = {
	type: "summary" | SectionType;
};

export function SectionDropdownMenu({ type }: Props) {
	const prompt = usePrompt();
	const confirm = useConfirm();
	const { openDialog } = useDialogStore();

	const updateResumeData = useUpdateResumeData();
	const resume = useCurrentResume();
	const section = type === "summary" ? resume.data.summary : resume.data.sections[type];
	const dropDownValue =
		type === "skills" && resume.data.sections[type].layout === "inline" ? "inline" : section.columns.toString();

	const onAddItem = () => {
		if (type === "summary") return;
		openDialog(`resume.sections.${type}.create`, undefined);
	};

	const onSortByDate = () => {
		if ((type !== "experience" && type !== "education") || resume.isLocked) return;

		let unresolvedLabels: string[] = [];
		if (type === "experience") {
			const currentItems = resume.data.sections.experience.items;
			const result = sortSectionItemsByPeriod(currentItems, resume.data.metadata.page.locale);
			const labelById = new Map(currentItems.map((item) => [item.id, item.company.trim() || item.id]));
			unresolvedLabels = result.unresolvedIds.map((id) => labelById.get(id) ?? id);
			updateResumeData((draft) => {
				draft.sections.experience.items = result.items;
			});
		} else {
			const currentItems = resume.data.sections.education.items;
			const result = sortSectionItemsByPeriod(currentItems, resume.data.metadata.page.locale);
			const labelById = new Map(currentItems.map((item) => [item.id, item.school.trim() || item.id]));
			unresolvedLabels = result.unresolvedIds.map((id) => labelById.get(id) ?? id);
			updateResumeData((draft) => {
				draft.sections.education.items = result.items;
			});
		}

		if (unresolvedLabels.length > 0) {
			toast.add({
				type: "warning",
				description: t`Could not sort these items; they stayed at the end: ${unresolvedLabels.join(", ")}.`,
			});
		}
	};

	const onToggleVisibility = () => {
		updateResumeData((draft) => {
			if (type === "summary") {
				draft.summary.hidden = !draft.summary.hidden;
			} else {
				draft.sections[type].hidden = !draft.sections[type].hidden;
			}
		});
	};

	const onRenameSection = async () => {
		const newTitle = await prompt(t`What do you want to rename this section to?`, {
			description: t`Leave empty to reset the title to the original.`,
			defaultValue: section.title,
		});

		if (newTitle === null || newTitle === section.title) return;

		updateResumeData((draft) => {
			if (type === "summary") {
				draft.summary.title = newTitle ?? "";
			} else {
				draft.sections[type].title = newTitle ?? "";
			}
		});
	};

	const onSetColumns = (value: string) => {
		updateResumeData((draft) => {
			if (type === "skills") {
				if (value === "inline") {
					draft.sections[type].layout = value;
					draft.sections[type].columns = 1;
					return;
				}
				draft.sections[type].layout = "default";
			}

			if (type === "summary") {
				draft.summary.columns = Number.parseInt(value, 10);
			} else {
				draft.sections[type].columns = Number.parseInt(value, 10);
			}
		});
	};

	const onReset = async () => {
		const confirmed = await confirm(t`Are you sure you want to reset this section?`, {
			description: t`This will remove all items from this section.`,
			confirmText: t({
				comment: "Destructive confirmation button label when resetting a resume section",
				message: "Reset",
			}),
			cancelText: t({
				comment: "Confirmation dialog button label to abort resetting a resume section",
				message: "Cancel",
			}),
		});

		if (!confirmed) return;

		updateResumeData((draft) => {
			if (type === "summary") {
				draft.summary.content = "";
			} else {
				draft.sections[type].items = [];
			}
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button size="icon" variant="ghost" aria-label={t`Section options`}>
						<ListIcon />
					</Button>
				}
			/>

			<DropdownMenuContent align="end">
				{type !== "summary" && (
					<>
						<DropdownMenuGroup>
							<DropdownMenuItem onClick={onAddItem}>
								<PlusIcon />
								<Trans>Add a new item</Trans>
							</DropdownMenuItem>

							{(type === "experience" || type === "education") && (
								<DropdownMenuItem disabled={resume.isLocked} onClick={onSortByDate}>
									<SortDescendingIcon />
									<Trans>Sort by date</Trans>
								</DropdownMenuItem>
							)}
						</DropdownMenuGroup>

						<DropdownMenuSeparator />
					</>
				)}

				<DropdownMenuGroup>
					<DropdownMenuItem onClick={onToggleVisibility}>
						{section.hidden ? <EyeIcon /> : <EyeClosedIcon />}
						{section.hidden ? <Trans>Show</Trans> : <Trans>Hide</Trans>}
					</DropdownMenuItem>

					<DropdownMenuItem onClick={onRenameSection}>
						<PencilSimpleLineIcon />
						<Trans>Rename</Trans>
					</DropdownMenuItem>

					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<ColumnsIcon />
							<Trans>Columns</Trans>
						</DropdownMenuSubTrigger>

						<DropdownMenuSubContent>
							<DropdownMenuRadioGroup value={dropDownValue} onValueChange={onSetColumns}>
								{[1, 2, 3, 4, 5, 6].map((column) => (
									<DropdownMenuRadioItem key={column} value={column.toString()}>
										<Plural value={column} one="# Column" other="# Columns" />
									</DropdownMenuRadioItem>
								))}

								{type === "skills" && (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuRadioItem value="inline">
											<Trans>1 Column / Inline</Trans>
										</DropdownMenuRadioItem>
									</>
								)}
							</DropdownMenuRadioGroup>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuItem variant="destructive" onClick={onReset}>
						<BroomIcon />
						<Trans>Reset</Trans>
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
