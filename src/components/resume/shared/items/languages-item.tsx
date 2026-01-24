import type { SectionItem } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { PageLevel } from "../page-level";

type LanguagesItemProps = SectionItem<"languages"> & {
	className?: string;
};

export function LanguagesItem({ className, ...item }: LanguagesItemProps) {
	return (
		<div className={cn("languages-item", className)}>
			{/* Header */}
			<div className="section-item-header flex flex-col">
				{/* Row 1 */}
				<strong className="section-item-title languages-item-name">{item.language}</strong>

				{/* Row 2 */}
				<span className="section-item-metadata languages-item-fluency opacity-80">{item.fluency}</span>
			</div>

			{/* Level */}
			<PageLevel level={item.level} className="section-item-level languages-item-level" />
		</div>
	);
}
