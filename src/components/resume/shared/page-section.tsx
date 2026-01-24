import type { SectionItem, SectionType } from "@/schema/resume/data";
import { getSectionTitle } from "@/utils/resume/section";
import { cn } from "@/utils/style";
import { useResumeStore } from "../store/resume";

type PageSectionProps<T extends SectionType> = {
	type: T;
	className?: string;
	children: (item: SectionItem<T>) => React.ReactNode;
};

export function PageSection<T extends SectionType>({ type, className, children }: PageSectionProps<T>) {
	const section = useResumeStore((state) => state.resume.data.sections[type]);

	const items = section.items.filter((item) => !item.hidden);

	if (section.hidden) return null;
	if (items.length === 0) return null;

	return (
		<section className={cn(`page-section page-section-${type}`, className)}>
			<h6 className="mb-2 text-(--page-primary-color)">{section.title || getSectionTitle(type)}</h6>

			<div
				className="section-content grid gap-x-(--page-gap-x) gap-y-(--page-gap-y)"
				style={{ gridTemplateColumns: `repeat(${section.columns}, 1fr)` }}
			>
				{items.map((item) => (
					<div key={item.id} className={cn(`section-item section-item-${type} print:break-inside-avoid`)}>
						{children(item)}
					</div>
				))}
			</div>
		</section>
	);
}
