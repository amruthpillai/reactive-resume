import { Plural, Trans } from "@lingui/react/macro";
import {
	ColumnsIcon,
	CopySimpleIcon,
	DotsThreeVerticalIcon,
	EyeClosedIcon,
	EyeIcon,
	PencilSimpleLineIcon,
	TrashSimpleIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, Reorder } from "motion/react";
import { match } from "ts-pattern";
import { useResumeStore } from "@/components/resume/store/resume";
import { Badge } from "@/components/ui/badge";
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
import type { CustomSection, CustomSectionItem as CustomSectionItemType, SectionType } from "@/schema/resume/data";
import { getSectionTitle } from "@/utils/resume/section";
import { cn } from "@/utils/style";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

function getItemTitle(type: SectionType, item: CustomSectionItemType): string {
	return match(type)
		.with("profiles", () => ("network" in item ? item.network : ""))
		.with("experience", () => ("company" in item ? item.company : ""))
		.with("education", () => ("school" in item ? item.school : ""))
		.with("projects", () => ("name" in item ? item.name : ""))
		.with("skills", () => ("name" in item ? item.name : ""))
		.with("languages", () => ("language" in item ? item.language : ""))
		.with("interests", () => ("name" in item ? item.name : ""))
		.with("awards", () => ("title" in item ? item.title : ""))
		.with("certifications", () => ("title" in item ? item.title : ""))
		.with("publications", () => ("title" in item ? item.title : ""))
		.with("volunteer", () => ("organization" in item ? item.organization : ""))
		.with("references", () => ("name" in item ? item.name : ""))
		.exhaustive();
}

function getItemSubtitle(type: SectionType, item: CustomSectionItemType): string | undefined {
	return match(type)
		.with("profiles", () => ("username" in item ? item.username : undefined))
		.with("experience", () => ("position" in item ? item.position : undefined))
		.with("education", () => ("degree" in item ? item.degree : undefined))
		.with("projects", () => ("period" in item ? item.period : undefined))
		.with("skills", () => ("proficiency" in item ? item.proficiency : undefined))
		.with("languages", () => ("fluency" in item ? item.fluency : undefined))
		.with("interests", () => undefined)
		.with("awards", () => ("awarder" in item ? item.awarder : undefined))
		.with("certifications", () => ("issuer" in item ? item.issuer : undefined))
		.with("publications", () => ("publisher" in item ? item.publisher : undefined))
		.with("volunteer", () => ("period" in item ? item.period : undefined))
		.with("references", () => undefined)
		.exhaustive();
}

export function CustomSectionBuilder() {
	const customSections = useResumeStore((state) => state.resume.data.customSections);

	return (
		<SectionBase type="custom" className={cn("space-y-4", customSections.length === 0 && "border-dashed")}>
			<AnimatePresence>
				{customSections.map((section) => (
					<CustomSectionContainer key={section.id} section={section} />
				))}
			</AnimatePresence>

			{/* Add Custom Section Button */}
			<SectionAddItemButton type="custom" variant="outline" className="rounded-md">
				<Trans>Add a new custom section</Trans>
			</SectionAddItemButton>
		</SectionBase>
	);
}

function CustomSectionContainer({ section }: { section: CustomSection }) {
	const { openDialog } = useDialogStore();
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const onUpdateSection = () => {
		openDialog("resume.sections.custom.update", section);
	};

	const handleReorder = (items: CustomSectionItemType[]) => {
		updateResumeData((draft) => {
			const sectionIndex = draft.customSections.findIndex((_section) => _section.id === section.id);
			if (sectionIndex === -1) return;
			draft.customSections[sectionIndex].items = items;
		});
	};

	return (
		<div className="rounded-md border">
			{/* Section Header */}
			<div className="group flex select-none">
				<button
					type="button"
					onClick={onUpdateSection}
					className={cn(
						"flex flex-1 flex-col items-start justify-center space-y-0.5 p-4 text-start transition-opacity hover:bg-secondary/40 focus:outline-none focus-visible:ring-1",
						section.hidden && "opacity-50",
					)}
				>
					<Badge variant="secondary" className="mb-1.5 rounded-sm">
						{getSectionTitle(section.type)}
					</Badge>
					<span className="line-clamp-1 text-wrap font-medium text-base">{section.title}</span>
					<span className="text-muted-foreground text-xs">
						<Plural value={section.items.length} one="# item" other="# items" />
					</span>
				</button>

				<CustomSectionDropdownMenu section={section} />
			</div>

			{/* Section Items */}
			{section.items.length > 0 && (
				<div className={cn("border-t", section.hidden && "opacity-50")}>
					<Reorder.Group axis="y" values={section.items} onReorder={handleReorder}>
						<AnimatePresence>
							{section.items.map((item) => (
								<SectionItem
									key={item.id}
									type={section.type}
									item={item}
									customSectionId={section.id}
									title={getItemTitle(section.type, item)}
									subtitle={getItemSubtitle(section.type, item)}
								/>
							))}
						</AnimatePresence>
					</Reorder.Group>
				</div>
			)}

			{/* Add Item Button */}
			<div className="border-t">
				<SectionAddItemButton type={section.type} customSectionId={section.id}>
					<Trans>Add a new item</Trans>
				</SectionAddItemButton>
			</div>
		</div>
	);
}

function CustomSectionDropdownMenu({ section }: { section: CustomSection }) {
	const confirm = useConfirm();
	const { openDialog } = useDialogStore();
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const onToggleSectionVisibility = () => {
		updateResumeData((draft) => {
			const sectionIndex = draft.customSections.findIndex((_section) => _section.id === section.id);
			if (sectionIndex === -1) return;
			draft.customSections[sectionIndex].hidden = !draft.customSections[sectionIndex].hidden;
		});
	};

	const onUpdateSection = () => {
		openDialog("resume.sections.custom.update", section);
	};

	const onDuplicateSection = () => {
		openDialog("resume.sections.custom.create", section);
	};

	const onSetColumns = (value: string) => {
		updateResumeData((draft) => {
			const sectionIndex = draft.customSections.findIndex((_section) => _section.id === section.id);
			if (sectionIndex === -1) return;
			draft.customSections[sectionIndex].columns = parseInt(value, 10);
		});
	};

	const onDeleteSection = async () => {
		const confirmed = await confirm("Are you sure you want to delete this custom section?", {
			confirmText: "Delete",
			cancelText: "Cancel",
		});

		if (!confirmed) return;

		updateResumeData((draft) => {
			draft.customSections = draft.customSections.filter((_section) => _section.id !== section.id);
			draft.metadata.layout.pages = draft.metadata.layout.pages.map((page) => ({
				...page,
				main: page.main.filter((id) => id !== section.id),
				sidebar: page.sidebar.filter((id) => id !== section.id),
			}));
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex cursor-context-menu items-center px-1.5 opacity-40 transition-[background-color,opacity] hover:bg-secondary/40 focus:outline-none focus-visible:ring-1 group-hover:opacity-100"
				>
					<DotsThreeVerticalIcon />
				</button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end">
				<DropdownMenuGroup>
					<DropdownMenuItem onSelect={onToggleSectionVisibility}>
						{section.hidden ? <EyeIcon /> : <EyeClosedIcon />}
						{section.hidden ? <Trans>Show</Trans> : <Trans>Hide</Trans>}
					</DropdownMenuItem>

					<DropdownMenuItem onSelect={onUpdateSection}>
						<PencilSimpleLineIcon />
						<Trans>Update</Trans>
					</DropdownMenuItem>

					<DropdownMenuItem onSelect={onDuplicateSection}>
						<CopySimpleIcon />
						<Trans>Duplicate</Trans>
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
					<DropdownMenuItem variant="destructive" onSelect={onDeleteSection}>
						<TrashSimpleIcon />
						<Trans>Delete</Trans>
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
