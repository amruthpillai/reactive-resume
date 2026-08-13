import { describe, expect, it, vi } from "vitest";
import { hashSemanticCssResumeId, recordSemanticCssEvent } from "./stylesheet-observability";

const sensitive = "Ada Lovelace <ada@example.test> /* private comment */";

describe("semantic CSS observability", () => {
	it("emits the bounded structured fields with a stable domain-separated resume hash", () => {
		const logger = vi.fn();

		recordSemanticCssEvent(
			{
				name: "semantic_css.preflight",
				resumeId: "resume-123",
				durationMs: 17,
				languageVersion: 1,
				sourceBytes: 42,
				template: "onyx",
				diagnosticCodes: ["MISSING_VERSION_DIRECTIVE"],
				pageCount: 2,
				revision: 9,
				success: true,
			},
			logger,
		);

		expect(logger).toHaveBeenCalledWith({
			name: "semantic_css.preflight",
			resumeIdHash: hashSemanticCssResumeId("resume-123"),
			durationMs: 17,
			languageVersion: 1,
			sourceBytes: 42,
			template: "onyx",
			diagnosticCodes: ["MISSING_VERSION_DIRECTIVE"],
			pageCount: 2,
			revision: 9,
			success: true,
		});
		expect(hashSemanticCssResumeId("resume-123")).toMatch(/^[a-f0-9]{64}$/);
		expect(hashSemanticCssResumeId("resume-123")).not.toBe(hashSemanticCssResumeId("123"));
	});

	it("never logs source, comments, resume content, personal fields, raw IDs, or unsafe diagnostic text", () => {
		const logger = vi.fn();
		const input = {
			name: "semantic_css.compile",
			resumeId: sensitive,
			durationMs: 4,
			languageVersion: 1,
			sourceBytes: 101,
			template: "onyx",
			diagnosticCodes: ["PARSE_ERROR", sensitive],
			pageCount: null,
			revision: 3,
			success: false,
			source: sensitive,
			comments: sensitive,
			resume: { basics: { name: sensitive } },
			email: sensitive,
		} as const;

		recordSemanticCssEvent(input, logger);

		const serialized = JSON.stringify(logger.mock.calls);
		const event = logger.mock.calls[0]?.[0];
		expect(serialized).not.toContain(sensitive);
		expect(event).not.toHaveProperty("source");
		expect(event).not.toHaveProperty("comments");
		expect(event).not.toHaveProperty("resume");
		expect(event).not.toHaveProperty("email");
		expect(logger).toHaveBeenCalledWith(
			expect.objectContaining({ diagnosticCodes: ["PARSE_ERROR", "UNKNOWN_DIAGNOSTIC"] }),
		);
	});
});
