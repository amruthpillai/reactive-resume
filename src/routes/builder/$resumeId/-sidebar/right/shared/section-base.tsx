import { CaretDownIcon } from "@phosphor-icons/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { getSectionIcon, getSectionTitle, type RightSidebarSection } from "@/utils/resume/section";
import { cn } from "@/utils/style";
import { useSectionStore } from "../../../-store/section";

type Props = React.ComponentProps<typeof AccordionContent> & {
	type: RightSidebarSection;
};

export function SectionBase({ type, className, ...props }: Props) {
	const collapsed = useSectionStore((state) => state.sections[type]?.collapsed ?? false);
	const toggleCollapsed = useSectionStore((state) => state.toggleCollapsed);

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
							<Button size="icon" variant="ghost">
								<CaretDownIcon className="transition-transform duration-200 group-data-closed/accordion-item:-rotate-90" />
							</Button>
						}
					/>

					<div className="flex flex-1 items-center gap-x-4">
						{getSectionIcon(type)}
						<h2 className="line-clamp-1 font-bold text-2xl tracking-tight">{getSectionTitle(type)}</h2>
					</div>
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
