// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock locale module so getLocaleMessages returns a known mapping
// without trying to dynamically load .po files (which Vite/glob handles
// only inside the real bundle).
vi.mock("@/libs/locale", () => ({
	resolveLocale: (locale: string) => locale || "en-US",
	getLocaleMessages: async (locale: string) => ({
		locale,
		messages: {},
	}),
}));

beforeEach(() => {
	vi.resetModules();
});

afterEach(() => {
	vi.resetModules();
});

describe("createSectionTitleResolverForLocale", () => {
	it("returns a resolver function that produces section titles", async () => {
		const { createSectionTitleResolverForLocale } = await import("./section-title-locale");

		const resolver = await createSectionTitleResolverForLocale("en-US");
		const title = resolver({ sectionId: "experience", locale: "en-US", sectionKind: "builtin" });

		expect(typeof title).toBe("string");
		expect(title.length).toBeGreaterThan(0);
	});

	it("caches resolvers per requested locale", async () => {
		const { createSectionTitleResolverForLocale } = await import("./section-title-locale");

		const a = await createSectionTitleResolverForLocale("en-US");
		const b = await createSectionTitleResolverForLocale("en-US");

		expect(a).toBe(b);
	});

	it("falls back to en-US for an unknown locale", async () => {
		const { createSectionTitleResolverForLocale } = await import("./section-title-locale");

		const resolver = await createSectionTitleResolverForLocale("xx-YY");
		const title = resolver({ sectionId: "skills", locale: "en-US", sectionKind: "builtin" });

		expect(typeof title).toBe("string");
		expect(title.length).toBeGreaterThan(0);
	});
});

describe("useSectionTitleResolver", () => {
	it("returns null when no locale is provided", async () => {
		const { useSectionTitleResolver } = await import("./section-title-locale");

		const { result } = renderHook(() => useSectionTitleResolver(undefined));
		expect(result.current).toBeNull();
	});

	it("loads a resolver when a locale is provided", async () => {
		const { useSectionTitleResolver } = await import("./section-title-locale");

		const { result, rerender } = renderHook(
			({ locale }: { locale: string | undefined }) => useSectionTitleResolver(locale),
			{
				initialProps: { locale: "en-US" as string | undefined },
			},
		);

		// Initially null while the resolver is loading async.
		expect(result.current).toBeNull();

		await act(async () => {
			// Flush microtasks so the async resolver settles.
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(typeof result.current).toBe("function");

		// Switching to undefined clears the resolver.
		rerender({ locale: undefined });
		expect(result.current).toBeNull();
	});
});
