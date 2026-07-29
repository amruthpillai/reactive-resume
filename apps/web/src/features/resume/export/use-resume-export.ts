import type { PublicStyleProjection } from "@reactive-resume/pdf/public-projection";
import type { ResumeExportTarget } from "@reactive-resume/resume/export-sections";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { SemanticStylesheet } from "@reactive-resume/schema/resume/stylesheet";
import type { ResumePdfPresentation } from "./pdf-document";
import { t } from "@lingui/core/macro";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { buildDocx } from "@reactive-resume/docx";
import { getResumeSectionTitle } from "@reactive-resume/pdf/section-title";
import { getResumeExportData, resumeHasCoverLetter } from "@reactive-resume/resume/export-sections";
import { buildMarkdown } from "@reactive-resume/resume/markdown";
import { downloadWithAnchor, generateFilename } from "@reactive-resume/utils/file";
import { useStylesheetStore } from "@/features/resume/stylesheet/store";
import { createSectionTitleResolverForLocale } from "@/libs/resume/section-title-locale";
import { createResumePdfBlob } from "./pdf-document";

/**
 * Section titles are stored empty by default and resolved (locale-aware) at render time. PDF does
 * this via an injected resolver; DOCX and Markdown reuse the same resolution here so their section
 * headings aren't blank. Returns a `(sectionId) => title` function.
 */
const createSectionTitleResolver = async (data: ResumeData) => {
	const resolveSectionTitle = await createSectionTitleResolverForLocale(data.metadata.page.locale);
	const dataWithResolver = { ...data, resolveSectionTitle };
	return (sectionId: string) => getResumeSectionTitle(dataWithResolver, sectionId);
};

// ponytail: loosened from Resume to Pick so public-resume (where name may be "" for non-owners) can reuse
type ExportableResume = {
	id?: string;
	name: string;
	slug: string;
	data: ResumeData;
};

type UseResumeExportOptions = {
	publicStyleProjection?: PublicStyleProjection;
};

const getExportName = (resume: ExportableResume) => resume.name || resume.data.basics.name || resume.slug;
const getTargetExportName = (resume: ExportableResume, target: ResumeExportTarget) =>
	target === "cover-letter" ? `${getExportName(resume)} Cover Letter` : getExportName(resume);

type DownloadPdfOptions = {
	includeCoverLetterHeader?: boolean;
};

/**
 * Single source of truth for resume export (PDF / DOCX / JSON / Print). Previously duplicated verbatim
 * between the builder dock and the right-panel Export section (#17).
 */
export function useResumeExport(resume: ExportableResume | undefined, exportOptions: UseResumeExportOptions = {}) {
	const [isExporting, setIsExporting] = useState(false);
	const hasCoverLetter = resume ? resumeHasCoverLetter(resume.data) : false;
	const stylesheetResumeId = useStylesheetStore((state) => state.resumeId);
	const stylesheetMode = useStylesheetStore((state) => state.mode);
	const stylesheetSource = useStylesheetStore((state) => state.source);
	const stylesheetApplied = useStylesheetStore((state) => state.applied);
	const canonicalStylesheet = useMemo<SemanticStylesheet | undefined>(
		() =>
			resume?.id && resume.id === stylesheetResumeId
				? {
						mode: stylesheetMode,
						source: stylesheetSource,
						applied: stylesheetApplied,
					}
				: undefined,
		[resume?.id, stylesheetApplied, stylesheetMode, stylesheetResumeId, stylesheetSource],
	);
	const pdfPresentation = useMemo<ResumePdfPresentation | undefined>(
		() =>
			exportOptions.publicStyleProjection
				? { publicStyleProjection: exportOptions.publicStyleProjection }
				: canonicalStylesheet
					? { stylesheet: { mode: canonicalStylesheet.mode, applied: canonicalStylesheet.applied } }
					: undefined,
		[canonicalStylesheet, exportOptions.publicStyleProjection],
	);

	const onDownloadJSON = useCallback(() => {
		if (!resume) return;
		const data = canonicalStylesheet
			? {
					...resume.data,
					metadata: {
						...resume.data.metadata,
						stylesheet: canonicalStylesheet,
					},
				}
			: resume.data;
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
		downloadWithAnchor(blob, generateFilename(getExportName(resume), "json"));
	}, [canonicalStylesheet, resume]);

	const onDownloadMarkdown = useCallback(
		async (target: ResumeExportTarget = "resume") => {
			if (!resume) return;
			if (target === "cover-letter" && !resumeHasCoverLetter(resume.data)) return;
			const data = getResumeExportData(resume.data, target);
			const resolveTitle = await createSectionTitleResolver(data);
			const blob = new Blob([buildMarkdown(data, resolveTitle)], { type: "text/markdown" });
			downloadWithAnchor(blob, generateFilename(getTargetExportName(resume, target), "md"));
		},
		[resume],
	);

	const onDownloadDOCX = useCallback(
		async (target: ResumeExportTarget = "resume") => {
			if (!resume) return;
			if (target === "cover-letter" && !resumeHasCoverLetter(resume.data)) return;
			try {
				const data = getResumeExportData(resume.data, target);
				const resolveTitle = await createSectionTitleResolver(data);
				const blob = await buildDocx(data, resolveTitle);
				downloadWithAnchor(blob, generateFilename(getTargetExportName(resume, target), "docx"));
			} catch {
				toast.error(t`There was a problem while generating the DOCX, please try again.`);
			}
		},
		[resume],
	);

	const onDownloadPDF = useCallback(
		async (target: ResumeExportTarget = "resume", downloadOptions?: DownloadPdfOptions) => {
			if (!resume) return;
			if (target === "cover-letter" && !resumeHasCoverLetter(resume.data)) return;
			const toastId = toast.loading(t`Please wait while your PDF is being generated...`);
			setIsExporting(true);
			try {
				const data = getResumeExportData(resume.data, target);
				const blob = await createResumePdfBlob(
					data,
					undefined,
					target === "cover-letter"
						? { includeCoverLetterHeader: downloadOptions?.includeCoverLetterHeader }
						: undefined,
					pdfPresentation,
				);
				downloadWithAnchor(blob, generateFilename(getTargetExportName(resume, target), "pdf"));
			} catch {
				toast.error(t`There was a problem while generating the PDF, please try again.`);
			} finally {
				setIsExporting(false);
				toast.dismiss(toastId);
			}
		},
		[pdfPresentation, resume],
	);

	const onPrint = useCallback(async () => {
		if (!resume) return;
		const toastId = toast.loading(t`Preparing your resume for printing...`);
		setIsExporting(true);
		try {
			const blob = await createResumePdfBlob(resume.data, undefined, undefined, pdfPresentation);
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
	}, [pdfPresentation, resume]);

	return { onDownloadJSON, onDownloadMarkdown, onDownloadDOCX, onDownloadPDF, onPrint, isExporting, hasCoverLetter };
}
