import { PDFViewer } from "@react-pdf/renderer";
import { createFileRoute } from "@tanstack/react-router";
import { useIsClient } from "usehooks-ts";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { templateSchema } from "@reactive-resume/schema/templates";
import { useLocalizedResumeDocument } from "@/libs/resume/pdf-document";

export const Route = createFileRoute("/templates/$")({
	component: TemplatePdfRoute,
	errorComponent: () => <div>Template not found</div>,
});

function TemplatePdfRoute() {
	const isClient = useIsClient();
	const params = Route.useParams();

	const templateName = params._splat?.split(".")[0] ?? "azurill";
	const template = templateSchema.parse(templateName);
	const resumeDocument = useLocalizedResumeDocument(sampleResumeData, template);

	if (!isClient || !resumeDocument) return null;

	return (
		<PDFViewer showToolbar={false} style={{ height: "100svh", width: "100svw", border: "none" }}>
			{resumeDocument}
		</PDFViewer>
	);
}
