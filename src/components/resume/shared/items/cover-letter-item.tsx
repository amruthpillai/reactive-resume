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
			{stripHtml(item.recipient) && (
				<div className="cover-letter-item-recipient mb-4">
					<TiptapContent content={item.recipient} />
				</div>
			)}

			{stripHtml(item.content) && (
				<div className="cover-letter-item-content">
					<TiptapContent content={item.content} />
				</div>
			)}
		</div>
	);
}
