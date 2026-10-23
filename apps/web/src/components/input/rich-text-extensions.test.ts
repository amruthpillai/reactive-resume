// @vitest-environment happy-dom

import { expect, it } from "vite-plus/test";
import { Editor } from "@tiptap/react";
import { richTextExtensions } from "./rich-text-extensions";

it("keeps supported table formatting and drops other CSS from imported tables", () => {
	const editor = new Editor({
		extensions: richTextExtensions,
		content:
			'<table style="width: 100%; position: fixed; inset: 0"><tbody><tr><td style="padding: 4px; background-image: url(https://example.test/x.png)"><p>Cell</p></td></tr></tbody></table>',
	});
	const html = editor.getHTML();
	editor.destroy();

	expect(html).toContain("width: 100%");
	expect(html).toContain("padding: 4px");
	expect(html).not.toMatch(/position|inset|background-image/);
});
