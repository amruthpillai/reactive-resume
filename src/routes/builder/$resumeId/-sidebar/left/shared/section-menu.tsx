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
} from "@phosphor-icons/react";
import { useResumeStore } from "@/components/resume/store/resume";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dropdown-menu";
import { useDialogStore } from "@/dialogs/store";
import { useConfirm } from "@/hooks/use-confirm";
import { usePrompt } from "@/hooks/use-prompt";
import type { SectionType } from "@/schema/resume/data";

type Props = {
	type: "summary" | SectionType;
};

export function SectionDropdownMenu({ type }: Props) {
	const prompt = usePrompt();
	const confirm = useConfirm();
	const { openDialog } = useDialogStore();

	const updateResumeData = useResumeStore((state) => state.updateResumeData);
	const section = useResumeStore((state) =>
		type === "summary" ? state.resume.data.summary : state.resume.data.sections[type],
	);

	const onAddItem = () => {
		if (type === "summary") return;
		openDialog(`resume.sections.${type}.create`, undefined);
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
			if (type === "summary") {
				draft.summary.columns = parseInt(value, 10);
			} else {
				draft.sections[type].columns = parseInt(value, 10);
			}
		});
	};

	const onReset = async () => {
		const confirmed = await confirm("Are you sure you want to reset this section?", {
			description: "This will remove all items from this section.",
			confirmText: "Reset",
			cancelText: "Cancel",
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
			<DropdownMenuTrigger asChild>
				<Button size="icon" variant="ghost">
					<ListIcon />
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end">
				{type !== "summary" && (
					<>
						<DropdownMenuGroup>
							<DropdownMenuItem onSelect={onAddItem}>
								<PlusIcon />
								<Trans>Add a new item</Trans>
							</DropdownMenuItem>
						</DropdownMenuGroup>

						<DropdownMenuSeparator />
					</>
				)}

				<DropdownMenuGroup>
					<DropdownMenuItem onSelect={onToggleVisibility}>
						{section.hidden ? <EyeIcon /> : <EyeClosedIcon />}
						{section.hidden ? <Trans>Show</Trans> : <Trans>Hide</Trans>}
					</DropdownMenuItem>

					<DropdownMenuItem onSelect={onRenameSection}>
						<PencilSimpleLineIcon />
						<Trans>Rename</Trans>
					</DropdownMenuItem>

					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<ColumnsIcon />
							<Trans>Columns</Trans>
						</DropdownMenuSubTrigger>

						<DropdownMenuSubContent>
							<DropdownMenuRadioGroup value={section.columns.toString()} onValueChange={onSetColumns}>
								{[1, 2, 3, 4, 5, 6].map((column) => (
									<DropdownMenuRadioItem key={column} value={column.toString()}>
										<Plural value={column} one="# Column" other="# Columns" />
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuItem variant="destructive" onSelect={onReset}>
						<BroomIcon />
						<Trans>Reset</Trans>
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
