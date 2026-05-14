import { t } from "@lingui/core/macro";
import { CircleNotchIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { BrandIcon } from "@reactive-resume/ui/components/brand-icon";
import { Button } from "@reactive-resume/ui/components/button";
import { downloadWithAnchor, generateFilename } from "@reactive-resume/utils/file";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { orpc } from "@/libs/orpc/client";
import { createResumePdfBlob } from "@/libs/resume/pdf-document";
import { PdfViewer } from "./pdf-viewer";

const publicResumeRoute = getRouteApi("/$username/$slug");

export function PublicResumeRoute() {
	const { username, slug } = publicResumeRoute.useParams();

	const { data: resume } = useQuery(orpc.resume.getBySlug.queryOptions({ input: { username, slug } }));
	const [isPrinting, setIsPrinting] = useState(false);

	const onDownloadPDF = useCallback(async () => {
		if (!resume) return;

		const filename = generateFilename(resume.name || resume.data.basics.name || resume.slug, "pdf");
		const toastId = toast.loading(t`Please wait while your PDF is being generated...`);

		setIsPrinting(true);

		try {
			const blob = await createResumePdfBlob(resume.data);
			downloadWithAnchor(blob, filename);
		} catch {
			toast.error(t`There was a problem while generating the PDF, please try again.`);
		} finally {
			setIsPrinting(false);
			toast.dismiss(toastId);
		}
	}, [resume]);

	if (!resume) return <LoadingScreen />;

	return (
		<>
			<div className="mx-auto flex w-full flex-col items-center gap-6 px-4 py-6 print:m-0 print:block print:max-w-full print:p-0">
				<div className="w-full max-w-5xl bg-white print:max-w-full">
					<PdfViewer data={resume.data} className="block w-full" />
				</div>

				<footer className="flex justify-center print:hidden">
					<BrandIcon variant="icon" className="size-8 opacity-60" />
				</footer>
			</div>

			<Button
				size="icon-lg"
				variant="outline"
				disabled={isPrinting}
				onClick={onDownloadPDF}
				aria-label={t`Download PDF`}
				title={t`Download PDF`}
				className="fixed right-6 bottom-6 z-50 rounded-full bg-background/95 opacity-70 shadow-lg backdrop-blur transition-opacity hover:opacity-100 print:hidden"
			>
				{isPrinting ? <CircleNotchIcon className="size-5 animate-spin" /> : <DownloadSimpleIcon className="size-5" />}
			</Button>
		</>
	);
}
