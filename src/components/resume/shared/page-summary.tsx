import { TiptapContent } from "@/components/input/rich-input";
import { getSectionTitle } from "@/utils/resume/section";
import { stripHtml } from "@/utils/string";
import { cn } from "@/utils/style";

import { useResumeStore } from "../store/resume";

type PageSummaryProps = {
	className?: string;
};

export function PageSummary({ className }: PageSummaryProps) {
	const section = useResumeStore((state) => state.resume.data.summary);

	if (section.hidden || !stripHtml(section.content)) return null;

	return (
		<section className={cn("page-section page-section-summary", className)}>
			<h6 className="mb-1.5 text-(--page-primary-color)">{section.title || getSectionTitle("summary")}</h6>

			<div className="section-content">
				<TiptapContent style={{ columnCount: section.columns }} content={section.content} />
			</div>
		</section>
	);
}
