import type { PageOperatorSummary } from "../types";
import {
	IMAGE_PAINT_OPS,
	INVISIBLE_TEXT_RENDER_MODES,
	PATH_PAINT_OPS,
	PDF_OPS,
	REPEATED_IMAGE_OPS,
	TEXT_SHOW_OPS,
} from "../pdf-ops";

export type OperatorListLike = {
	fnArray: ArrayLike<number>;
	argsArray: ArrayLike<unknown>;
};

type Matrix = readonly [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** Text rendering modes whose fill colour is actually painted. */
const FILLING_TEXT_RENDER_MODES = new Set([0, 2, 4, 6]);

/** A single repeat operator drawing thousands of tiles is a tiling pattern, not a photo. */
const MAX_REPEAT_INSTANCES = 4096;

type GraphicsState = {
	ctm: Matrix;
	fillIsWhite: boolean;
	textRenderMode: number;
};

/** pdf.js `Util.transform`: apply `next` in the coordinate system `current` already establishes. */
function multiply(current: Matrix, next: Matrix): Matrix {
	return [
		current[0] * next[0] + current[2] * next[1],
		current[1] * next[0] + current[3] * next[1],
		current[0] * next[2] + current[2] * next[3],
		current[1] * next[2] + current[3] * next[3],
		current[0] * next[4] + current[2] * next[5] + current[4],
		current[1] * next[4] + current[3] * next[5] + current[5],
	];
}

/** Area of the unit square once `ctm` has been applied to it. */
function unitSquareArea(ctm: Matrix): number {
	return Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2]);
}

function toMatrix(value: unknown): Matrix | null {
	if (!isNumericArray(value) || value.length < 6) return null;

	const [a, b, c, d, e, f] = value;
	if (a === undefined || b === undefined || c === undefined || d === undefined || e === undefined || f === undefined) {
		return null;
	}

	return [a, b, c, d, e, f];
}

function isNumericArray(value: unknown): value is number[] {
	if (!Array.isArray(value) && !ArrayBuffer.isView(value)) return false;
	const list = value as ArrayLike<unknown>;
	for (let index = 0; index < list.length; index += 1) {
		if (typeof list[index] !== "number" || !Number.isFinite(list[index] as number)) return false;
	}
	return true;
}

/**
 * Repeat and group image operators carry per-instance data whose exact argument position has
 * moved between pdf.js releases. Rather than pin one shape, find the first array argument and
 * read an instance count off it — an over- or under-count only nudges a ratio that is clamped
 * to the page area anyway.
 */
function countRepeatInstances(args: unknown): number {
	if (!Array.isArray(args)) return 1;

	for (const arg of args) {
		if (!Array.isArray(arg) && !ArrayBuffer.isView(arg)) continue;

		const list = arg as ArrayLike<unknown>;
		if (list.length === 0) continue;

		// A flat [x, y, x, y, …] position list; anything else is one entry per instance.
		const instances = isNumericArray(arg) ? Math.floor(list.length / 2) : list.length;
		return Math.min(Math.max(instances, 1), MAX_REPEAT_INSTANCES);
	}

	return 1;
}

function readsAsWhite(args: unknown, operator: number): boolean {
	if (!Array.isArray(args) && !ArrayBuffer.isView(args)) return false;
	const list = args as ArrayLike<number>;

	if (operator === PDF_OPS.setFillGray) return list[0] === 1;
	if (operator === PDF_OPS.setFillCMYKColor) {
		return list[0] === 0 && list[1] === 0 && list[2] === 0 && list[3] === 0;
	}

	// setFillRGBColor carries 0–255 components.
	return list[0] === 255 && list[1] === 255 && list[2] === 255;
}

/**
 * Walks a page's operator list, tracking the transform stack, so image coverage is measured in
 * page points rather than guessed from an operator count.
 *
 * Pure and synchronous: the caller owns whatever budget decided this page was worth walking.
 */
export function summarizePageOperators(
	operatorList: OperatorListLike,
	page: { width: number; height: number },
): PageOperatorSummary {
	const stack: GraphicsState[] = [];
	let state: GraphicsState = { ctm: IDENTITY, fillIsWhite: false, textRenderMode: 0 };

	let imageArea = 0;
	let imageCount = 0;
	let pathOpCount = 0;
	let invisibleTextItems = 0;
	let whiteFillTextItems = 0;

	const push = () => {
		stack.push({ ...state });
	};

	const pop = () => {
		const restored = stack.pop();
		if (restored) state = restored;
	};

	const { fnArray, argsArray } = operatorList;

	for (let index = 0; index < fnArray.length; index += 1) {
		const operator = fnArray[index];
		if (operator === undefined) continue;
		const args = argsArray[index];

		if (operator === PDF_OPS.save) {
			push();
			continue;
		}

		if (operator === PDF_OPS.restore) {
			pop();
			continue;
		}

		// A form XObject is an implicit save + concat; its End is the matching restore.
		if (operator === PDF_OPS.paintFormXObjectBegin || operator === PDF_OPS.beginGroup) {
			push();
			const matrix = Array.isArray(args) ? toMatrix(args[0]) : null;
			if (matrix) state = { ...state, ctm: multiply(state.ctm, matrix) };
			continue;
		}

		if (operator === PDF_OPS.paintFormXObjectEnd || operator === PDF_OPS.endGroup) {
			pop();
			continue;
		}

		if (operator === PDF_OPS.transform) {
			const matrix = toMatrix(args);
			if (matrix) state = { ...state, ctm: multiply(state.ctm, matrix) };
			continue;
		}

		if (operator === PDF_OPS.setTextRenderingMode) {
			const mode = Array.isArray(args) ? args[0] : undefined;
			if (typeof mode === "number") state = { ...state, textRenderMode: mode };
			continue;
		}

		if (
			operator === PDF_OPS.setFillRGBColor ||
			operator === PDF_OPS.setFillGray ||
			operator === PDF_OPS.setFillCMYKColor
		) {
			state = { ...state, fillIsWhite: readsAsWhite(args, operator) };
			continue;
		}

		// A pattern or separation fill is not something we can call white with any confidence.
		if (operator === PDF_OPS.setFillColorN || operator === PDF_OPS.setFillColorSpace) {
			state = { ...state, fillIsWhite: false };
			continue;
		}

		if (IMAGE_PAINT_OPS.has(operator)) {
			const instances = REPEATED_IMAGE_OPS.has(operator) ? countRepeatInstances(args) : 1;
			imageCount += instances;
			imageArea += unitSquareArea(state.ctm) * instances;
			continue;
		}

		if (PATH_PAINT_OPS.has(operator)) {
			pathOpCount += 1;
			continue;
		}

		if (TEXT_SHOW_OPS.has(operator)) {
			if (INVISIBLE_TEXT_RENDER_MODES.has(state.textRenderMode)) invisibleTextItems += 1;
			else if (state.fillIsWhite && FILLING_TEXT_RENDER_MODES.has(state.textRenderMode)) whiteFillTextItems += 1;
		}
	}

	const pageArea = page.width * page.height;
	const imageAreaRatio = pageArea > 0 ? Math.min(1, imageArea / pageArea) : 0;

	return { imageAreaRatio, imageCount, pathOpCount, invisibleTextItems, whiteFillTextItems };
}
