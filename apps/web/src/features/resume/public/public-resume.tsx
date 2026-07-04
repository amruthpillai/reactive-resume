import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CircleNotchIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { BrandIcon } from "@reactive-resume/ui/components/brand-icon";
import { Button } from "@reactive-resume/ui/components/button";
import { downloadWithAnchor, generateFilename } from "@reactive-resume/utils/file";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { createResumePdfBlob } from "@/features/resume/export/pdf-document";
import { orpc } from "@/libs/orpc/client";
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

	const { basics, picture } = resume.data;

	return (
		<>
			<div className="mx-auto flex w-full flex-col items-center gap-6 px-4 py-6 print:m-0 print:block print:max-w-full print:p-0">
				<header className="flex w-full max-w-5xl flex-col items-center gap-4 text-center print:hidden">
					{picture.url && !picture.hidden && (
						<img src={picture.url} alt={basics.name} className="size-20 rounded-full object-cover shadow-sm" />
					)}
					<div className="space-y-1">
						{basics.name && <h1 className="font-semibold text-2xl tracking-tight">{basics.name}</h1>}
						{basics.headline && <p className="text-muted-foreground">{basics.headline}</p>}
					</div>
					<Button onClick={onDownloadPDF} disabled={isPrinting}>
						{isPrinting ? (
							<CircleNotchIcon className="size-4 animate-spin" />
						) : (
							<DownloadSimpleIcon className="size-4" />
						)}
						<Trans>Download PDF</Trans>
					</Button>
				</header>

				<main className="w-full max-w-5xl bg-white print:max-w-full">
					<PdfViewer data={resume.data} className="block w-full" />
				</main>

				<footer className="flex justify-center print:hidden">
					<a
						href="/"
						className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
					>
						<BrandIcon variant="icon" className="size-5" />
						<Trans>Build your own resume</Trans>
					</a>
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
