import { lazy, Suspense } from "react";
import { useSectionStore } from "../../../-store/section";
import { SectionBase } from "../shared/section-base";

const StylesheetEditorShell = lazy(() => import("@/features/resume/stylesheet/editor"));

export function CustomStylesSectionBuilder() {
	const collapsed = useSectionStore((state) => state.sections.styles?.collapsed ?? false);

	return (
		<SectionBase type="styles" className="space-y-4">
			{collapsed ? null : (
				<Suspense
					fallback={
						<div role="status" className="h-72 animate-pulse rounded-md bg-muted" aria-label="Loading editor" />
					}
				>
					<StylesheetEditorShell />
				</Suspense>
			)}
		</SectionBase>
	);
}
