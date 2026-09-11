import { describe, expect, it } from "vitest";
import { serializeStylesheetColor, toStylesheetPickerColor } from "./color-format";

describe("stylesheet picker color formatting", () => {
	it.each([
		["rgba(231, 0, 11, 1)", "#e7000b"],
		["rgba(21, 93, 252, 0)", "#155dfc00"],
		["rgba(21, 93, 252, 0.5)", "#155dfc80"],
		["rgba(255, 255, 255, 0.25)", "#ffffff40"],
	])("serializes %s with alpha only when needed", (input, expected) => {
		expect(serializeStylesheetColor(input)).toBe(expected);
	});

	it("does not invent a resolved value for currentcolor", () => {
		expect(toStylesheetPickerColor("currentcolor")).toBe("currentcolor");
	});

	it.each(["#e7000b", "#155dfc00", "#155dfc80", "#ffffff40", "#abcdef01", "#abcdeffe"])(
		"retains every color and alpha byte when reopening %s",
		(value) => expect(serializeStylesheetColor(toStylesheetPickerColor(value))).toBe(value),
	);

	it.each([
		["red", "#ff0000"],
		["BLUE", "#0000ff"],
		["rgb(100% 0% 0% / 50%)", "#ff000080"],
		["rgb(21 93 252 / 0.5)", "#155dfc80"],
		["#F00", "#ff0000"],
		["#F000", "#ff000000"],
		["#f008", "#ff000088"],
		["hsl(120, 100%, 50%)", "#00ff00"],
		["hsla(120, 100%, 50%, 0.5)", "#00ff0080"],
		["hsl(120 100% 50% / 25%)", "#00ff0040"],
		["rgba(21, 93, 252, 0.5)", "#155dfc80"],
		["transparent", "#00000000"],
	])("adapts existing %s to the picker without losing its color", (input, expected) => {
		expect(serializeStylesheetColor(toStylesheetPickerColor(input))).toBe(expected);
	});

	it.each(["invalid", "rgba(1, 2, 3, nope)", "rgba(256, 0, 0, 1)", "rgba(1, 2, 3, 1.1)"])(
		"rejects invalid picker output %s",
		(value) => expect(serializeStylesheetColor(value)).toBeNull(),
	);
});
