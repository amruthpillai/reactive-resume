import type { RightSidebarSection } from "@/libs/resume/section";
import { t } from "@lingui/core/macro";
import { CaretDownIcon } from "@phosphor-icons/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@reactive-resume/ui/components/accordion";
import { Button } from "@reactive-resume/ui/components/button";
import { cn } from "@reactive-resume/utils/style";
import { getSectionIcon, getSectionTitle } from "@/libs/resume/section";
import { useSectionStore } from "../../../-store/section";

type Props = React.ComponentProps<typeof AccordionContent> & {
	type: RightSidebarSection;
};

export function SectionBase({ type, className, ...props }: Props) {
	const collapsed = useSectionStore((state) => state.sections[type]?.collapsed ?? false);
	const toggleCollapsed = useSectionStore((state) => state.toggleCollapsed);
	const sectionTitle = getSectionTitle(type);

	return (
		<Accordion
			className="space-y-4"
			id={`sidebar-${type}`}
			value={collapsed ? [] : [type]}
			onValueChange={() => toggleCollapsed(type)}
		>
			<AccordionItem value={type} className="group/accordion-item space-y-4">
				<div className="flex items-center">
					<AccordionTrigger
						className="me-2 items-center justify-center"
						render={
							<Button size="icon" variant="ghost" aria-label={t`Toggle ${sectionTitle} section`}>
								<CaretDownIcon className="transition-transform duration-200 group-data-closed/accordion-item:-rotate-90" />
							</Button>
						}
					/>

					<div className="flex flex-1 items-center gap-x-4">
						{getSectionIcon(type)}
						<h2 className="line-clamp-1 font-semibold text-2xl tracking-tight">{sectionTitle}</h2>
					</div>
				</div>

				<AccordionContent className={cn("overflow-hidden pb-0", className)} {...props} />
			</AccordionItem>
		</Accordion>
	);
}
