import { TiptapContent } from "@/components/input/rich-input";
import { getSectionTitle } from "@/utils/resume/section";
import { cn } from "@/utils/style";
import { useResumeStore } from "../store/resume";

type PageSummaryProps = {
	className?: string;
};

export function PageSummary({ className }: PageSummaryProps) {
	const section = useResumeStore((state) => state.resume.data.summary);

	return (
		<section
			className={cn(
				"page-section page-section-summary",
				section.hidden && "hidden",
				section.content === "" && "hidden",
				className,
			)}
		>
			<h6 className="mb-2 text-(--page-primary-color)">{section.title || getSectionTitle("summary")}</h6>

			<div className="section-content">
				<TiptapContent style={{ columnCount: section.columns }} content={section.content} />
			</div>
		</section>
	);
}
