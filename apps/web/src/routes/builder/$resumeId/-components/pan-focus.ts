/**
 * Drops focus from whatever element currently holds it, mirroring what the browser would have
 * done natively when the user presses the mouse down on the (non-focusable) preview canvas.
 *
 * `react-zoom-pan-pinch` calls `preventDefault()` on its window-level `mousedown` listener so
 * that dragging the canvas does not select text. That also cancels the browser's native focus
 * shift, so focus stays on whatever was focused before the pan — typically the sidebar button
 * that opened the last dialog, since closing a dialog restores focus to its trigger. A Space
 * keypress then activates that still-focused button on keyup and the dialog reopens.
 *
 * @see https://github.com/amruthpillai/reactive-resume/issues/3300
 */
export function blurFocusedElementOnPan(): void {
	if (typeof document === "undefined") return;

	const element = document.activeElement;
	if (!(element instanceof HTMLElement) || element === document.body) return;

	element.blur();
}
