export const PDF_PREFLIGHT_DIAGNOSTIC_CATALOG = {
	STYLESHEET_PREFLIGHT_INVALID: {
		meaning: "The stylesheet has compiler or semantic errors.",
		action: "Fix the accompanying Semantic CSS diagnostics.",
	},
	STYLESHEET_PREFLIGHT_PAGE_SIZE_LIMIT: {
		meaning: "An authored page exceeds the PDF dimension or area budget.",
		action: "Use a smaller page size.",
	},
	STYLESHEET_PREFLIGHT_BYTE_LIMIT: {
		meaning: "The rendered PDF exceeds the byte budget.",
		action: "Reduce pages, images, or styled content.",
	},
	STYLESHEET_PREFLIGHT_PAGE_LIMIT: {
		meaning: "The rendered PDF exceeds the page-count budget.",
		action: "Reduce content or pagination.",
	},
	STYLESHEET_PREFLIGHT_TIMEOUT: {
		meaning: "PDF preflight exceeded its deadline.",
		action: "Reduce stylesheet or document complexity and retry.",
	},
	STYLESHEET_PREFLIGHT_MEMORY_LIMIT: {
		meaning: "PDF preflight exceeded its memory budget.",
		action: "Reduce document, image, or layout complexity.",
	},
	STYLESHEET_PREFLIGHT_RENDER_FAILED: {
		meaning: "The PDF renderer could not render the candidate stylesheet.",
		action: "Simplify the candidate and inspect accompanying diagnostics.",
	},
	STYLESHEET_PREFLIGHT_PARSE_FAILED: {
		meaning: "The rendered PDF could not be inspected.",
		action: "Retry after simplifying the candidate.",
	},
	STYLESHEET_PREFLIGHT_WORKER_FAILED: {
		meaning: "The isolated PDF preflight worker failed or its queue was full.",
		action: "Retry; simplify the candidate if the failure repeats.",
	},
} as const;

export type PdfPreflightFailureCode = keyof typeof PDF_PREFLIGHT_DIAGNOSTIC_CATALOG;

export const STYLESHEET_PREFLIGHT_LIMITS = Object.freeze({
	// Render deadline (after the worker is warm). A rich resume on a throttled/shared
	// vCPU renders in ~5-18s, so 5s spuriously failed real resumes; the worker is now
	// warmed+reused so this ceiling only bounds a genuinely stuck render.
	timeoutMs: 30_000,
	maxPages: 20,
	maxBytes: 10_000_000,
	maxPageWidthPt: 2_000,
	maxPageHeightPt: 20_000,
	maxPageAreaPt2: 20_000_000,
	maxOldGenerationMb: 256,
	maxConcurrentWorkers: 1,
	maxQueuedRequests: 32,
});
