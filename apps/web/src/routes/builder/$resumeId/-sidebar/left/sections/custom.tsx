import type {
	CustomSection,
	CustomSectionItem as CustomSectionItemType,
	CustomSectionType,
} from "@reactive-resume/schema/resume/data";
import { t } from "@lingui/core/macro";
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
import { Badge } from "@reactive-resume/ui/components/badge";
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
import { stripHtml } from "@reactive-resume/utils/string";
import { cn } from "@reactive-resume/utils/style";
import { useDialogStore } from "@/dialogs/store";
import { useCurrentBuilderResumeSelector, useUpdateResumeData } from "@/features/resume/builder/draft";
import { useConfirm } from "@/hooks/use-confirm";
import { getSectionTitle } from "@/libs/resume/section";
import { SectionBase } from "../shared/section-base";
import { SectionAddItemButton, SectionItem } from "../shared/section-item";

// ponytail: data maps replace ts-pattern exhaustive matchers — same coverage, no runtime dependency
const TITLE_FIELD: Partial<Record<CustomSectionType, string>> = {
	profiles: "network",
	experience: "company",
	education: "school",
	projects: "name",
	skills: "name",
	languages: "language",
	interests: "name",
	awards: "title",
	certifications: "title",
	publications: "title",
	volunteer: "organization",
	references: "name",
};

const SUBTITLE_FIELD: Partial<Record<CustomSectionType, string>> = {
	profiles: "username",
	experience: "position",
	education: "degree",
	projects: "period",
	skills: "proficiency",
	languages: "fluency",
	awards: "awarder",
	certifications: "issuer",
	publications: "publisher",
	volunteer: "period",
};

function truncateHtml(html: string, max = 50): string {
	const stripped = stripHtml(html);
	return stripped.length > max ? `${stripped.slice(0, max)}...` : stripped;
}

function getItemTitle(type: CustomSectionType, item: CustomSectionItemType): string {
	if (type === "summary") {
		if ("content" in item) {
			return (
				truncateHtml(item.content) ||
				t({
					comment: "Fallback title for a custom summary item in resume builder when content is empty",
					message: "Summary",
				})
			);
		}
		return t({
			comment: "Fallback title for a custom summary item in resume builder when content is unavailable",
			message: "Summary",
		});
	}
	if (type === "cover-letter") {
		if ("recipient" in item) {
			return (
				truncateHtml(item.recipient) ||
				t({
					comment: "Fallback title for a custom cover letter item in resume builder when recipient is empty",
					message: "Cover Letter",
				})
			);
		}
		return t({
			comment: "Fallback title for a custom cover letter item in resume builder when recipient is unavailable",
			message: "Cover Letter",
		});
	}
	const field = TITLE_FIELD[type];
	return field && field in item ? String((item as Record<string, unknown>)[field]) : "";
}

function getItemSubtitle(type: CustomSectionType, item: CustomSectionItemType): string | undefined {
	if (type === "cover-letter") {
		if ("content" in item) {
			const result = truncateHtml(item.content);
			return result || undefined;
		}
		return undefined;
	}
	const field = SUBTITLE_FIELD[type];
	if (!field || !(field in item)) return undefined;
	const value = (item as Record<string, unknown>)[field];
	return typeof value === "string" ? value || undefined : undefined;
}

export function CustomSectionBuilder() {
	const customSections = useCurrentBuilderResumeSelector((resume) => resume.data.customSections);

	return (
		<SectionBase type="custom" className={cn("space-y-4", customSections.length === 0 && "border-dashed")}>
			<AnimatePresence>
				{customSections
					.filter((section) => !section.hidden)
					.map((section) => (
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

type CustomSectionContainerProps = {
	section: CustomSection;
};

function CustomSectionContainer({ section }: CustomSectionContainerProps) {
	const { openDialog } = useDialogStore();
	const updateResumeData = useUpdateResumeData();

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
					<Badge variant="secondary" className="mb-1.5 rounded-md">
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

type CustomSectionDropdownMenuProps = {
	section: CustomSection;
};

function CustomSectionDropdownMenu({ section }: CustomSectionDropdownMenuProps) {
	const confirm = useConfirm();
	const { openDialog } = useDialogStore();
	const updateResumeData = useUpdateResumeData();

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
			draft.customSections[sectionIndex].columns = Number.parseInt(value, 10);
		});
	};

	const onDeleteSection = async () => {
		const confirmed = await confirm(t`Are you sure you want to delete this custom section?`, {
			confirmText: t({
				comment: "Destructive confirmation button label when deleting a custom section in resume builder",
				message: "Delete",
			}),
			cancelText: t({
				comment: "Confirmation dialog button label to abort deleting a custom section in resume builder",
				message: "Cancel",
			}),
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
			<DropdownMenuTrigger aria-label={t`Section options`}>
				<DotsThreeVerticalIcon />
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end">
				<DropdownMenuGroup>
					<DropdownMenuItem onClick={onToggleSectionVisibility}>
						{section.hidden ? <EyeIcon /> : <EyeClosedIcon />}
						{section.hidden ? <Trans>Show</Trans> : <Trans>Hide</Trans>}
					</DropdownMenuItem>

					<DropdownMenuItem onClick={onUpdateSection}>
						<PencilSimpleLineIcon />
						<Trans>Update</Trans>
					</DropdownMenuItem>

					<DropdownMenuItem onClick={onDuplicateSection}>
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
					<DropdownMenuItem variant="destructive" onClick={onDeleteSection}>
						<TrashSimpleIcon />
						<Trans>Delete</Trans>
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
