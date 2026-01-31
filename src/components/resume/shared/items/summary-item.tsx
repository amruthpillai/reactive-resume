import { TiptapContent } from "@/components/input/rich-input";
import type { SummaryItem as SummaryItemType } from "@/schema/resume/data";
import { stripHtml } from "@/utils/string";
import { cn } from "@/utils/style";

type SummaryItemProps = SummaryItemType & {
	className?: string;
};

export function SummaryItem({ className, ...item }: SummaryItemProps) {
	if (!stripHtml(item.content)) return null;

	return (
		<div className={cn("summary-item", className)}>
			<TiptapContent content={item.content} />
		</div>
	);
}
