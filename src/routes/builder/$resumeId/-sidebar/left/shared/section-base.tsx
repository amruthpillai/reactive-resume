import { CaretRightIcon } from "@phosphor-icons/react";
import { useResumeStore } from "@/components/resume/store/resume";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { SectionType } from "@/schema/resume/data";
import { getSectionIcon, getSectionTitle, type LeftSidebarSection } from "@/utils/resume/section";
import { cn } from "@/utils/style";
import { useSectionStore } from "../../../-store/section";
import { SectionDropdownMenu } from "./section-menu";

type Props = React.ComponentProps<typeof AccordionContent> & {
	type: LeftSidebarSection;
};

export function SectionBase({ type, className, ...props }: Props) {
	const section = useResumeStore((state) => {
		if (type === "basics") return state.resume.data.basics;
		if (type === "summary") return state.resume.data.summary;
		if (type === "picture") return state.resume.data.picture;
		if (type === "custom") return state.resume.data.customSections;
		return state.resume.data.sections[type];
	});

	const isHidden = "hidden" in section && section.hidden;
	const collapsed = useSectionStore((state) => state.sections[type]?.collapsed ?? false);
	const toggleCollapsed = useSectionStore((state) => state.toggleCollapsed);

	return (
		<Accordion
			collapsible
			type="single"
			id={`sidebar-${type}`}
			value={collapsed ? "" : type}
			onValueChange={() => toggleCollapsed(type)}
			className={cn("space-y-4", isHidden && "opacity-50")}
		>
			<AccordionItem value={type} className="group/accordion space-y-4">
				<div className="flex items-center">
					<AccordionTrigger asChild className="me-2 items-center justify-center">
						<Button size="icon" variant="ghost">
							<CaretRightIcon />
						</Button>
					</AccordionTrigger>

					<div className="flex flex-1 items-center gap-x-4">
						{getSectionIcon(type)}
						<h2 className="line-clamp-1 font-bold text-2xl tracking-tight">
							{("title" in section && section.title) || getSectionTitle(type)}
						</h2>
					</div>

					{!["picture", "basics", "custom"].includes(type) && (
						<SectionDropdownMenu type={type as "summary" | SectionType} />
					)}
				</div>

				<AccordionContent
					className={cn(
						"overflow-hidden pb-0 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
						className,
					)}
					{...props}
				/>
			</AccordionItem>
		</Accordion>
	);
}
