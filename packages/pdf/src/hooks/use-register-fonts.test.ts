import type { ResumeData, Typography } from "@reactive-resume/schema/resume/data";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Font } from "@react-pdf/renderer";
import { getWebFontSource } from "@reactive-resume/fonts";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";

const typography = {
	body: {
		fontSize: 10,
		fontFamily: "IBM Plex Serif",
		lineHeight: 1.5,
		fontWeights: ["400", "500"],
	},
	heading: {
		fontSize: 14,
		fontFamily: "IBM Plex Serif",
		lineHeight: 1.5,
		fontWeights: ["600"],
	},
} satisfies Typography;

const cjkTypography = {
	body: {
		fontSize: 10,
		fontFamily: "Noto Serif SC",
		lineHeight: 1.5,
		fontWeights: ["400"],
	},
	heading: {
		fontSize: 14,
		fontFamily: "Noto Serif SC",
		lineHeight: 1.5,
		fontWeights: ["400"],
	},
} satisfies Typography;

describe("registerFonts", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("registers CJK PDF fallbacks for normal and italic text styles", async () => {
		const registerSpy = vi.spyOn(Font, "register").mockImplementation(() => {});
		vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const cjkFallbackSource = getWebFontSource("Noto Serif SC", "400", false);
		const { registerFonts } = await import("./use-register-fonts");

		const pdfTypography = registerFonts(typography, "zh-CN");

		expect(pdfTypography.body.fontFamily).toEqual(["IBM Plex Serif", "Noto Serif SC"]);
		expect(pdfTypography.heading.fontFamily).toEqual(["IBM Plex Serif", "Noto Serif SC"]);

		expect(registerSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				family: "Noto Serif SC",
				fontWeight: 400,
				fontStyle: "normal",
			}),
		);
		expect(registerSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				family: "Noto Serif SC",
				fontWeight: 400,
				fontStyle: "italic",
				src: cjkFallbackSource,
			}),
		);
	});

	it("registers a bold CJK fallback variant so <strong> renders bold for CJK glyphs", async () => {
		const registerSpy = vi.spyOn(Font, "register").mockImplementation(() => {});
		vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		// body has highest weight 700, heading has 600 — both should be registered
		// for the CJK fallback so textkit can substitute bold CJK glyphs.
		const boldTypography = {
			body: { ...typography.body, fontWeights: ["400", "700"] },
			heading: { ...typography.heading, fontWeights: ["400", "600"] },
		} satisfies Typography;

		registerFonts(boldTypography, "zh-CN");

		expect(registerSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				family: "Noto Serif SC",
				fontWeight: 700,
				fontStyle: "normal",
			}),
		);
		expect(registerSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				family: "Noto Serif SC",
				fontWeight: 700,
				fontStyle: "italic",
			}),
		);
		expect(registerSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				family: "Noto Serif SC",
				fontWeight: 600,
				fontStyle: "normal",
			}),
		);
	});

	it("uses the full CJK font source for synthetic italic variants when the CJK font is primary", async () => {
		const registerSpy = vi.spyOn(Font, "register").mockImplementation(() => {});
		vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const cjkFallbackSource = getWebFontSource("Noto Serif SC", "400", false);
		const { registerFonts } = await import("./use-register-fonts");

		registerFonts(cjkTypography, "zh-CN");

		expect(registerSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				family: "Noto Serif SC",
				fontWeight: 400,
				fontStyle: "italic",
				src: cjkFallbackSource,
			}),
		);
	});

	it("skips CJK PDF fallbacks for Latin locale and Latin content", async () => {
		const registerSpy = vi.spyOn(Font, "register").mockImplementation(() => {});
		vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		const pdfTypography = registerFonts(typography, "en-US");

		expect(pdfTypography.body.fontFamily).toBe("IBM Plex Serif");
		expect(pdfTypography.heading.fontFamily).toBe("IBM Plex Serif");
		expect(registerSpy).not.toHaveBeenCalledWith(expect.objectContaining({ family: "Noto Serif SC" }));
	});

	it("registers CJK PDF fallbacks for Latin locale when resume content contains CJK text", async () => {
		const registerSpy = vi.spyOn(Font, "register").mockImplementation(() => {});
		vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		const pdfTypography = registerFonts(typography, "en-US", true);

		expect(pdfTypography.body.fontFamily).toEqual(["IBM Plex Serif", "Noto Serif SC"]);
		expect(pdfTypography.heading.fontFamily).toEqual(["IBM Plex Serif", "Noto Serif SC"]);
		expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ family: "Noto Serif SC" }));
	});

	it("uses CJK line breaking for Latin locale when resume content contains CJK text", async () => {
		const registerHyphenationSpy = vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		registerFonts(typography, "en-US", true);

		const hyphenationCallback = registerHyphenationSpy.mock.calls.at(-1)?.[0];
		expect(hyphenationCallback?.("翠翠红红处处")).toEqual(["翠", "", "翠", "", "红", "", "红", "", "处", "", "处", ""]);
		expect(hyphenationCallback?.("Reactive")).toEqual([
			"R",
			"",
			"e",
			"",
			"a",
			"",
			"c",
			"",
			"t",
			"",
			"i",
			"",
			"v",
			"",
			"e",
			"",
		]);
	});

	it("returns typography with font weights sorted ascending", async () => {
		vi.spyOn(Font, "register").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		const baseTypography = {
			...typography,
			body: { ...typography.body, fontFamily: "Source Sans 3", fontWeights: ["800", "600", "400"] },
			heading: { ...typography.heading, fontFamily: "Source Sans 3", fontWeights: ["900", "500"] },
		} satisfies Typography;

		const pdfTypography = registerFonts(baseTypography, "en-US");

		expect(pdfTypography.body.fontWeights).toEqual(["400", "600", "800"]);
		expect(pdfTypography.heading.fontWeights).toEqual(["500", "900"]);
	});
});

describe("resumeContentContainsCJK", () => {
	it("detects CJK letters in summary content", async () => {
		const { resumeContentContainsCJK } = await import("./use-register-fonts");
		const data = {
			...defaultResumeData,
			summary: { ...defaultResumeData.summary, content: "<p>翠翠红红处处莺莺燕燕</p>" },
		} satisfies ResumeData;

		expect(resumeContentContainsCJK(data)).toBe(true);
	});

	it("does not scan private metadata notes", async () => {
		const { resumeContentContainsCJK } = await import("./use-register-fonts");
		const data = {
			...defaultResumeData,
			metadata: { ...defaultResumeData.metadata, notes: "中文" },
		} satisfies ResumeData;

		expect(resumeContentContainsCJK(data)).toBe(false);
	});
});
