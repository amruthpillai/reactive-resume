import { TiptapContent } from "@/components/input/rich-input";
import type { CoverLetterItem as CoverLetterItemType } from "@/schema/resume/data";
import { stripHtml } from "@/utils/string";
import { cn } from "@/utils/style";

type CoverLetterItemProps = CoverLetterItemType & {
	className?: string;
};

export function CoverLetterItem({ className, ...item }: CoverLetterItemProps) {
	if (!stripHtml(item.recipient) && !stripHtml(item.content)) return null;

	return (
		<div className={cn("cover-letter-item", className)}>
			<div className={cn("cover-letter-item-recipient mb-4", !stripHtml(item.recipient) && "hidden")}>
				<TiptapContent content={item.recipient} />
			</div>

			<div className={cn("cover-letter-item-content", !stripHtml(item.content) && "hidden")}>
				<TiptapContent content={item.content} />
			</div>
		</div>
	);
}
