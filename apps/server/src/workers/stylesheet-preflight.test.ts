import { describe, expect, it, vi } from "vitest";
import { inspectPreflightPdf } from "./stylesheet-preflight-inspection";

const warning = {
	code: "EXTREME_VALUE",
	severity: "warning",
	message: "The authored value is unusually large.",
	range: {
		start: { line: 1, column: 1, offset: 0 },
		end: { line: 1, column: 10, offset: 9 },
	},
} as const;

const rendered = {
	ok: true as const,
	bytes: new TextEncoder().encode("%PDF-1.7"),
	diagnostics: [warning],
};

const limits = {
	maxPages: 20,
	maxBytes: 10_000_000,
	maxPageWidthPt: 2_000,
	maxPageHeightPt: 20_000,
	maxPageAreaPt2: 20_000_000,
};

describe("stylesheet preflight PDF inspection", () => {
	it("preserves compiler warnings and hides parser exceptions", async () => {
		const destroy = vi.fn(async () => undefined);

		const result = await inspectPreflightPdf(rendered, limits, () => ({
			promise: Promise.reject(new Error("sensitive parser details")),
			destroy,
		}));

		expect(result).toEqual({
			ok: false,
			code: "STYLESHEET_PREFLIGHT_PARSE_FAILED",
			message: "PDF inspection failed.",
			diagnostics: [warning],
		});
		expect(destroy).toHaveBeenCalledOnce();
	});

	it("preserves compiler warnings when PDF.js fails before returning a loading task", async () => {
		const result = await inspectPreflightPdf(rendered, limits, () => {
			throw new Error("sensitive parser setup details");
		});

		expect(result).toEqual({
			ok: false,
			code: "STYLESHEET_PREFLIGHT_PARSE_FAILED",
			message: "PDF inspection failed.",
			diagnostics: [warning],
		});
	});
});
