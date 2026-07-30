// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { ACTIVE_PREVIEW_PAGE_SELECTOR, readPreviewPageDataUrl } from "./preview";

describe("preview helpers", () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it("reads the active preview while an exiting layer remains mounted", () => {
		document.body.innerHTML = `
			<div aria-hidden="true">
				<canvas aria-label="Resume page 1 of 1"></canvas>
			</div>
			<div aria-hidden="false">
				<canvas aria-label="Resume page 1 of 1"></canvas>
			</div>
		`;
		const [exiting, active] = document.querySelectorAll<HTMLCanvasElement>("canvas");
		if (!exiting || !active) throw new Error("Expected both preview layers.");
		exiting.toDataURL = () => "exiting";
		active.toDataURL = () => "active";

		expect(readPreviewPageDataUrl(ACTIVE_PREVIEW_PAGE_SELECTOR)).toBe("active");
	});
});
