// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { blurFocusedElementOnPan } from "./pan-focus";

afterEach(() => {
	document.body.innerHTML = "";
});

describe("blurFocusedElementOnPan", () => {
	it("blurs the focused element", () => {
		const button = document.createElement("button");
		document.body.append(button);
		button.focus();
		expect(document.activeElement).toBe(button);

		blurFocusedElementOnPan();

		expect(document.activeElement).not.toBe(button);
	});

	it("blurs a focused text field so panning does not keep it active", () => {
		const input = document.createElement("input");
		document.body.append(input);
		input.focus();

		blurFocusedElementOnPan();

		expect(document.activeElement).not.toBe(input);
	});

	it("does nothing when focus already rests on the body", () => {
		const blur = vi.spyOn(document.body, "blur");

		blurFocusedElementOnPan();

		expect(blur).not.toHaveBeenCalled();
		blur.mockRestore();
	});

	// The issue: closing a dialog restores focus to its trigger, and because react-zoom-pan-pinch
	// preventDefault()s the canvas mousedown the browser never moves focus away. Space then
	// activates the still-focused trigger on keyup and reopens the dialog.
	// https://github.com/amruthpillai/reactive-resume/issues/3300
	it("stops a Space keypress after panning from re-activating the last dialog trigger", () => {
		const trigger = document.createElement("button");
		const openDialog = vi.fn();
		trigger.addEventListener("click", openDialog);
		document.body.append(trigger);

		// Focus restored to the trigger when the dialog closed.
		trigger.focus();

		blurFocusedElementOnPan();

		// happy-dom does not synthesise the activation click that a browser fires on Space keyup,
		// so assert the precondition for it instead: the trigger no longer holds focus.
		expect(document.activeElement).not.toBe(trigger);
		expect(openDialog).not.toHaveBeenCalled();
	});
});
