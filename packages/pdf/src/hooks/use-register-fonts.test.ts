import type { ResumeData, Typography } from "@reactive-resume/schema/resume/data";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWebFontSource } from "@reactive-resume/fonts";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { Font } from "../renderer";

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

	it("registers the Korean Noto fallback for the ko-KR locale so Hangul renders", async () => {
		const registerSpy = vi.spyOn(Font, "register").mockImplementation(() => {});
		vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		const pdfTypography = registerFonts(typography, "ko-KR");

		expect(pdfTypography.body.fontFamily).toEqual(["IBM Plex Serif", "Noto Serif KR", "Noto Serif SC"]);
		expect(pdfTypography.heading.fontFamily).toEqual(["IBM Plex Serif", "Noto Serif KR", "Noto Serif SC"]);
		expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ family: "Noto Serif KR" }));
	});

	it("registers the Japanese Noto fallback for the ja-JP locale", async () => {
		const registerSpy = vi.spyOn(Font, "register").mockImplementation(() => {});
		vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		const pdfTypography = registerFonts(typography, "ja-JP");

		expect(pdfTypography.body.fontFamily).toEqual(["IBM Plex Serif", "Noto Serif JP", "Noto Serif SC"]);
		expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ family: "Noto Serif JP" }));
	});

	it("registers the Traditional Chinese Noto fallback for the zh-TW locale", async () => {
		const registerSpy = vi.spyOn(Font, "register").mockImplementation(() => {});
		vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		const pdfTypography = registerFonts(typography, "zh-TW");

		expect(pdfTypography.body.fontFamily).toEqual(["IBM Plex Serif", "Noto Serif TC", "Noto Serif SC"]);
		expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ family: "Noto Serif TC" }));
	});

	it("registers the Korean Noto fallback for Latin locale when content contains Hangul", async () => {
		const registerSpy = vi.spyOn(Font, "register").mockImplementation(() => {});
		vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		const pdfTypography = registerFonts(typography, "en-US", true, new Set(["hangul"]));

		expect(pdfTypography.body.fontFamily).toEqual(["IBM Plex Serif", "Noto Serif KR", "Noto Serif SC"]);
		expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ family: "Noto Serif KR" }));
	});

	it("registers the Arabic Noto fallback for the fa-IR (Persian) locale", async () => {
		const registerSpy = vi.spyOn(Font, "register").mockImplementation(() => {});
		vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		const pdfTypography = registerFonts(typography, "fa-IR");

		expect(pdfTypography.body.fontFamily).toEqual(["IBM Plex Serif", "Noto Naskh Arabic"]);
		expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ family: "Noto Naskh Arabic" }));
	});

	it("registers the Arabic Noto fallback for Latin locale when content contains Arabic", async () => {
		const registerSpy = vi.spyOn(Font, "register").mockImplementation(() => {});
		vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		const pdfTypography = registerFonts(typography, "en-US", false, new Set(["arabic"]));

		expect(pdfTypography.body.fontFamily).toEqual(["IBM Plex Serif", "Noto Naskh Arabic"]);
		expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ family: "Noto Naskh Arabic" }));
	});

	it("registers the Hebrew Noto fallback for the he-IL locale (no SC safety net)", async () => {
		const registerSpy = vi.spyOn(Font, "register").mockImplementation(() => {});
		vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		const pdfTypography = registerFonts(typography, "he-IL");

		expect(pdfTypography.body.fontFamily).toEqual(["IBM Plex Serif", "Noto Sans Hebrew"]);
		expect(registerSpy).not.toHaveBeenCalledWith(expect.objectContaining({ family: "Noto Serif SC" }));
	});

	it("registers the Thai Noto fallback for the th-TH locale", async () => {
		const registerSpy = vi.spyOn(Font, "register").mockImplementation(() => {});
		vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		const pdfTypography = registerFonts(typography, "th-TH");

		expect(pdfTypography.body.fontFamily).toEqual(["IBM Plex Serif", "Noto Sans Thai"]);
		expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ family: "Noto Sans Thai" }));
	});

	it("does NOT enable CJK per-character line breaking for non-CJK fallback scripts", async () => {
		const registerHyphenationSpy = vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		vi.spyOn(Font, "register").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		registerFonts(typography, "fa-IR");

		const hyphenationCallback = registerHyphenationSpy.mock.calls.at(-1)?.[0];
		// Arabic is cursive — words must NOT be split per character.
		expect(hyphenationCallback?.("سلام")).toEqual(["سلام"]);
	});

	it("registers bold CJK fallback variants so strong text keeps bold glyphs", async () => {
		const registerSpy = vi.spyOn(Font, "register").mockImplementation(() => {});
		vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

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
		// Latin words must stay intact even in CJK mode — no character-level breaking.
		expect(hyphenationCallback?.("Reactive")).toEqual(["Reactive"]);
	});

	it("adds locale-specific break points for long Latin words", async () => {
		const registerHyphenationSpy = vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		registerFonts(typography, "da-DK");

		const hyphenationCallback = registerHyphenationSpy.mock.calls.at(-1)?.[0];
		expect(hyphenationCallback?.("Reactive")).toEqual(["Reactive"]);
		expect(hyphenationCallback?.("Information")).toEqual(["In", "for", "ma", "tion"]);
		expect(hyphenationCallback?.("Produktivitet")).toEqual(["Pro", "duk", "ti", "vi", "tet"]);
		expect(hyphenationCallback?.("Tidsplanlægning,")).toEqual(["Tids", "plan", "læg", "ning,"]);
		expect(hyphenationCallback?.("Informationsstyring")).toEqual(["In", "for", "ma", "tions", "sty", "ring"]);
	});

	it("does not apply Danish hyphenation to English pages", async () => {
		const registerHyphenationSpy = vi.spyOn(Font, "registerHyphenationCallback").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		registerFonts(typography, "en-US");

		const hyphenationCallback = registerHyphenationSpy.mock.calls.at(-1)?.[0];
		expect(hyphenationCallback?.("Productivity")).toEqual(["Pro", "duc", "tiv", "i", "ty"]);
		expect(hyphenationCallback?.("Informationsstyring")).toEqual(["In", "for", "ma", "tion", "sstyring"]);
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

	it("replaces unsupported font weights with an available fallback pair", async () => {
		const registerSpy = vi.spyOn(Font, "register").mockImplementation(() => {});
		const { registerFonts } = await import("./use-register-fonts");

		const migratedTypography = {
			...typography,
			body: { ...typography.body, fontFamily: "Lato", fontWeights: ["400"] },
			heading: { ...typography.heading, fontFamily: "Lato", fontWeights: ["600"] },
		} satisfies Typography;

		const pdfTypography = registerFonts(migratedTypography, "en-US");

		expect(pdfTypography.body.fontWeights).toEqual(["400"]);
		expect(pdfTypography.heading.fontWeights).toEqual(["400", "700"]);
		expect(registerSpy).not.toHaveBeenCalledWith(expect.objectContaining({ family: "Lato", fontWeight: 600 }));
		expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ family: "Lato", fontWeight: 700 }));
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

describe("resumeContentScripts", () => {
	const withSummary = (content: string): ResumeData => ({
		...defaultResumeData,
		summary: { ...defaultResumeData.summary, content: `<p>${content}</p>` },
	});

	it("detects Hangul", async () => {
		const { resumeContentScripts } = await import("./use-register-fonts");
		expect([...resumeContentScripts(withSummary("안녕하세요"))]).toEqual(["hangul"]);
	});

	it("detects Kana", async () => {
		const { resumeContentScripts } = await import("./use-register-fonts");
		expect([...resumeContentScripts(withSummary("こんにちは"))]).toEqual(["kana"]);
	});

	it("detects Han as han-simplified", async () => {
		const { resumeContentScripts } = await import("./use-register-fonts");
		expect([...resumeContentScripts(withSummary("翠翠红红"))]).toEqual(["han-simplified"]);
	});

	it("detects Arabic (incl. Persian)", async () => {
		const { resumeContentScripts } = await import("./use-register-fonts");
		expect([...resumeContentScripts(withSummary("پژوهشگر امنیت"))]).toEqual(["arabic"]);
	});

	it("detects Hebrew", async () => {
		const { resumeContentScripts } = await import("./use-register-fonts");
		expect([...resumeContentScripts(withSummary("שלום עולם"))]).toEqual(["hebrew"]);
	});

	it("detects Thai", async () => {
		const { resumeContentScripts } = await import("./use-register-fonts");
		expect([...resumeContentScripts(withSummary("สวัสดี"))]).toEqual(["thai"]);
	});

	it("detects multiple scripts in mixed content", async () => {
		const { resumeContentScripts } = await import("./use-register-fonts");
		const scripts = resumeContentScripts(withSummary("안녕 翠翠 سلام"));
		expect(scripts.has("hangul")).toBe(true);
		expect(scripts.has("han-simplified")).toBe(true);
		expect(scripts.has("arabic")).toBe(true);
	});

	it("returns an empty set for Latin-only content", async () => {
		const { resumeContentScripts } = await import("./use-register-fonts");
		expect(resumeContentScripts(withSummary("Reactive Resume")).size).toBe(0);
	});

	it("does not scan private metadata notes", async () => {
		const { resumeContentScripts } = await import("./use-register-fonts");
		const data = {
			...defaultResumeData,
			metadata: { ...defaultResumeData.metadata, notes: "안녕하세요" },
		} satisfies ResumeData;

		expect(resumeContentScripts(data).size).toBe(0);
	});
});
