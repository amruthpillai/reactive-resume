import type { Resume } from "@/features/resume/builder/draft";
import { t } from "@lingui/core/macro";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { buildDocx } from "@reactive-resume/docx";
import { downloadWithAnchor, generateFilename } from "@reactive-resume/utils/file";
import { createResumePdfBlob } from "./pdf-document";

/**
 * Single source of truth for resume export (PDF / DOCX / JSON / Print). Previously duplicated verbatim
 * between the builder dock and the right-panel Export section (#17).
 */
export function useResumeExport(resume: Resume | undefined) {
	const [isExporting, setIsExporting] = useState(false);

	const onDownloadJSON = useCallback(() => {
		if (!resume) return;
		const blob = new Blob([JSON.stringify(resume.data, null, 2)], { type: "application/json" });
		downloadWithAnchor(blob, generateFilename(resume.name, "json"));
	}, [resume]);

	const onDownloadDOCX = useCallback(async () => {
		if (!resume) return;
		try {
			const blob = await buildDocx(resume.data);
			downloadWithAnchor(blob, generateFilename(resume.name, "docx"));
		} catch {
			toast.error(t`There was a problem while generating the DOCX, please try again.`);
		}
	}, [resume]);

	const onDownloadPDF = useCallback(async () => {
		if (!resume) return;
		const toastId = toast.loading(t`Please wait while your PDF is being generated...`);
		setIsExporting(true);
		try {
			const blob = await createResumePdfBlob(resume.data);
			downloadWithAnchor(blob, generateFilename(resume.name, "pdf"));
		} catch {
			toast.error(t`There was a problem while generating the PDF, please try again.`);
		} finally {
			setIsExporting(false);
			toast.dismiss(toastId);
		}
	}, [resume]);

	const onPrint = useCallback(async () => {
		if (!resume) return;
		const toastId = toast.loading(t`Preparing your resume for printing...`);
		setIsExporting(true);
		try {
			const blob = await createResumePdfBlob(resume.data);
			const url = URL.createObjectURL(blob);
			// ponytail: print the generated PDF via a hidden iframe (reliable in Chromium). If the browser
			// blocks iframe printing, fall back to opening the PDF in a new tab so the user can print manually.
			const iframe = document.createElement("iframe");
			iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
			iframe.src = url;
			iframe.onload = () => {
				try {
					iframe.contentWindow?.focus();
					iframe.contentWindow?.print();
				} catch {
					window.open(url, "_blank", "noopener");
				}
				setTimeout(() => {
					iframe.remove();
					URL.revokeObjectURL(url);
				}, 60_000);
			};
			document.body.appendChild(iframe);
		} catch {
			toast.error(t`There was a problem while preparing your resume for printing, please try again.`);
		} finally {
			setIsExporting(false);
			toast.dismiss(toastId);
		}
	}, [resume]);

	return { onDownloadJSON, onDownloadDOCX, onDownloadPDF, onPrint, isExporting };
}
