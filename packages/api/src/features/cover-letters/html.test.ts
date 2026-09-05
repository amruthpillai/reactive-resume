import { describe, expect, it } from "vitest";
import { sanitizeCoverLetterHtml } from "./html";

describe("saved cover-letter HTML", () => {
	it("removes executable markup, event handlers and unsafe links", () => {
		const result = sanitizeCoverLetterHtml(
			'<script>alert(1)</script><p onclick="alert(2)">Hello <a href="javascript:alert(3)">team</a><img src=x onerror="alert(4)"></p>',
		);
		expect(result).toBe("<p>Hello <a>team</a></p>");
	});
	it("preserves rich editor formatting and safe links while removing CSS URL payloads", () => {
		const result = sanitizeCoverLetterHtml(
			'<p style="text-align:center;background-image:url(https://evil.test);color:#aabbcc"><strong>Dear</strong> <em>team</em><br><a href="https://example.com">Portfolio</a></p>',
		);
		expect(result).toContain('style="text-align:center;color:#aabbcc"');
		expect(result).toContain("<strong>Dear</strong> <em>team</em><br />");
		expect(result).toContain('href="https://example.com"');
		expect(result).not.toContain("evil.test");
	});
});
