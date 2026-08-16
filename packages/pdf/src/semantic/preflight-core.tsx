import type { SemanticCssDiagnostic } from "@reactive-resume/resume/stylesheet";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { StylesheetSource } from "@reactive-resume/schema/resume/stylesheet";
import type { Template } from "@reactive-resume/schema/templates";
import type { PdfPreflightFailureCode } from "./preflight-reference";
import { createElement } from "react";
import { parseResumeData } from "@reactive-resume/schema/resume/data";
import { pdf } from "#react-pdf-renderer";
import { ResumeDocument } from "../document";
import { getTemplatePageSize } from "../templates/shared/page-size";
import { semanticNodeKeys } from "./node-keys";
import { resolveResumeRuntime } from "./resolve";

export type { PdfPreflightFailureCode } from "./preflight-reference";

export type StylesheetPreflightInput = {
	data: ResumeData;
	template: Template;
	stylesheet: StylesheetSource;
};

export type PdfPreflightPageLimits = {
	maxPageWidthPt: number;
	maxPageHeightPt: number;
	maxPageAreaPt2: number;
};

export type PdfPreflightFailure = {
	ok: false;
	code: PdfPreflightFailureCode;
	message: string;
	diagnostics: readonly SemanticCssDiagnostic[];
};

export type PdfPreflightResult =
	| {
			ok: true;
			pageCount: number;
			byteCount: number;
			diagnostics: readonly SemanticCssDiagnostic[];
	  }
	| PdfPreflightFailure;

export type RenderPreflightPdfResult =
	| {
			ok: true;
			bytes: Uint8Array;
			diagnostics: readonly SemanticCssDiagnostic[];
	  }
	| PdfPreflightFailure;

export type StylesheetPreflightRunner = {
	run(input: StylesheetPreflightInput): Promise<PdfPreflightResult>;
};

export type BrowserPdfPreflightResult =
	| (Extract<PdfPreflightResult, { ok: true }> & { pdf: ArrayBuffer })
	| PdfPreflightFailure;

const pageDimensions = (size: "A4" | "LETTER" | { width: number; height?: number }) => {
	if (size === "LETTER") return { width: 612, height: 792 };
	if (size === "A4") return { width: 595.28, height: 841.89 };
	return { width: size.width, height: size.height ?? 841.89 };
};

const pageSizeFailure = (
	data: ResumeData,
	presentation: ReturnType<typeof resolveResumeRuntime>["presentation"],
	limits: PdfPreflightPageLimits,
): PdfPreflightFailure | undefined => {
	const fallbackSize = getTemplatePageSize(data.metadata.page.format);

	for (const index of data.metadata.layout.pages.keys()) {
		const size = presentation[semanticNodeKeys.page(index + 1)]?.size ?? fallbackSize;
		const { width, height } = pageDimensions(size);
		if (width > limits.maxPageWidthPt || height > limits.maxPageHeightPt || width * height > limits.maxPageAreaPt2) {
			return {
				ok: false,
				code: "STYLESHEET_PREFLIGHT_PAGE_SIZE_LIMIT",
				message: "The authored page size exceeds the PDF preflight limit.",
				diagnostics: [],
			};
		}
	}
};

export async function renderPreflightPdf(
	input: StylesheetPreflightInput,
	pageLimits: PdfPreflightPageLimits,
): Promise<RenderPreflightPdfResult> {
	const parsedData = parseResumeData(input.data);
	const data = {
		...parsedData,
		metadata: {
			...parsedData.metadata,
			stylesheet: {
				mode: "semantic" as const,
				source: input.stylesheet,
			},
		},
	};
	const inspection = resolveResumeRuntime({
		data,
		template: input.template,
		source: input.stylesheet,
		mode: "semantic",
	});

	if (inspection.diagnostics.some(({ severity }) => severity === "error")) {
		return {
			ok: false,
			code: "STYLESHEET_PREFLIGHT_INVALID",
			message: "The stylesheet cannot be rendered.",
			diagnostics: inspection.diagnostics,
		};
	}

	const pageFailure = pageSizeFailure(data, inspection.presentation, pageLimits);
	if (pageFailure) return { ...pageFailure, diagnostics: inspection.diagnostics };

	try {
		const document = createElement(ResumeDocument, { data, template: input.template }) as Parameters<typeof pdf>[0];
		const blob = await pdf(document).toBlob();
		return {
			ok: true,
			bytes: new Uint8Array(await blob.arrayBuffer()),
			diagnostics: inspection.diagnostics,
		};
	} catch {
		return {
			ok: false,
			code: "STYLESHEET_PREFLIGHT_RENDER_FAILED",
			message: "PDF rendering failed.",
			diagnostics: inspection.diagnostics,
		};
	}
}
