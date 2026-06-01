import type { SectionType } from "@reactive-resume/schema/resume/data";
import type { LeftSidebarSection } from "@/libs/resume/section";
import { CaretDownIcon } from "@phosphor-icons/react";
import { getDefaultSectionIconName } from "@reactive-resume/schema/resume/section-icons";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@reactive-resume/ui/components/accordion";
import { Button } from "@reactive-resume/ui/components/button";
import { cn } from "@reactive-resume/utils/style";
import { IconPicker } from "@/components/input/icon-picker";
import { useCurrentResume, useUpdateResumeData } from "@/features/resume/builder/draft";
import { getSectionIcon, getSectionTitle } from "@/libs/resume/section";
import { useSectionStore } from "../../../-store/section";
import { SectionDropdownMenu } from "./section-menu";

type Props = React.ComponentProps<typeof AccordionContent> & {
	type: LeftSidebarSection;
};

export function SectionBase({ type, className, ...props }: Props) {
	const resume = useCurrentResume();
	const updateResumeData = useUpdateResumeData();
	const data = resume.data;
	const section =
		type === "basics"
			? data.basics
			: type === "summary"
				? data.summary
				: type === "picture"
					? data.picture
					: type === "custom"
						? data.customSections
						: data.sections[type];

	const isHidden = "hidden" in section && section.hidden;
	const hasSectionIcon = !["picture", "basics", "custom"].includes(type);
	const rawIcon = "icon" in section && typeof section.icon === "string" ? section.icon : "";
	const fallbackIcon = hasSectionIcon ? getDefaultSectionIconName(type as "summary" | SectionType) : "";
	const sectionIcon = rawIcon === "none" ? "" : rawIcon || fallbackIcon;

	const collapsed = useSectionStore((state) => state.sections[type]?.collapsed ?? false);
	const toggleCollapsed = useSectionStore((state) => state.toggleCollapsed);

	const onIconChange = (icon: string) => {
		// Store "none" when user explicitly picks the empty/prohibit option
		const valueToStore = icon === "" ? "none" : icon;

		updateResumeData((draft) => {
			if (type === "summary") {
				draft.summary.icon = valueToStore;
			} else if (type !== "basics" && type !== "picture" && type !== "custom") {
				draft.sections[type as SectionType].icon = valueToStore;
			}
		});
	};

	return (
		<Accordion
			id={`sidebar-${type}`}
			value={collapsed ? [] : [type]}
			onValueChange={() => toggleCollapsed(type)}
			className={cn("space-y-4", isHidden && "opacity-50")}
		>
			<AccordionItem value={type} className="group/accordion-item space-y-4">
				<div className="flex items-center">
					<AccordionTrigger
						className="me-2 items-center justify-center"
						render={
							<Button size="icon" variant="ghost">
								<CaretDownIcon className="transition-transform duration-200 group-data-closed/accordion-item:-rotate-90" />
							</Button>
						}
					/>

					<div className={cn("flex flex-1 items-center gap-x-4", hasSectionIcon && "gap-x-2")}>
						{hasSectionIcon ? (
							<IconPicker value={sectionIcon} onChange={onIconChange} size="icon" variant="ghost" />
						) : (
							getSectionIcon(type)
						)}
						<h2 className="line-clamp-1 font-semibold text-2xl tracking-tight">
							{("title" in section && section.title) || getSectionTitle(type)}
						</h2>
					</div>

					{!["picture", "basics", "custom"].includes(type) && (
						<SectionDropdownMenu type={type as "summary" | SectionType} />
					)}
				</div>

				<AccordionContent
					className={cn(
						"p-0 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
						className,
					)}
					{...props}
				/>
			</AccordionItem>
		</Accordion>
	);
}
