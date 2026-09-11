import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Locale } from "@reactive-resume/utils/locale";
import type { ReactNode } from "react";
import type { SectionTitleResolver } from "./section-title";
import { createContext, use, useMemo } from "react";
import { isCJKLocale, isRTL } from "@reactive-resume/utils/locale";
import { resumeContentContainsCJK } from "./hooks/use-register-fonts";
import { createHyphenationCallback } from "./hyphenation";

export type ResumeRenderOptions = {
	includeCoverLetterHeader?: boolean;
};

type RenderContextValue = ResumeData & {
	resolveSectionTitle?: SectionTitleResolver | undefined;
	renderOptions: ResumeRenderOptions;
	rtl: boolean;
	hyphenationCallback: ReturnType<typeof createHyphenationCallback>;
};

const RenderContext = createContext<RenderContextValue | null>(null);
const defaultRenderOptions: ResumeRenderOptions = {};

type RenderProviderProps = {
	data: ResumeData;
	resolveSectionTitle?: SectionTitleResolver | undefined;
	renderOptions?: ResumeRenderOptions | undefined;
	children: ReactNode;
};

export const RenderProvider = ({
	data,
	resolveSectionTitle,
	renderOptions = defaultRenderOptions,
	children,
}: RenderProviderProps) => {
	const rtl = isRTL(data.metadata.page.locale);
	const hyphenationCallback = useMemo(
		() =>
			createHyphenationCallback({
				locale: data.metadata.page.locale,
				automatic: data.metadata.typography.hyphenation === true,
				cjk: isCJKLocale(data.metadata.page.locale as Locale) || resumeContentContainsCJK(data),
			}),
		[data],
	);
	const contextValue = useMemo<RenderContextValue>(
		() => ({ ...data, resolveSectionTitle, renderOptions, rtl, hyphenationCallback }),
		[data, resolveSectionTitle, renderOptions, rtl, hyphenationCallback],
	);

	return <RenderContext.Provider value={contextValue}>{children}</RenderContext.Provider>;
};

export const useRender = (): RenderContextValue => {
	const context = use(RenderContext);

	if (!context) throw new Error("useRender must be called inside a <RenderProvider>.");

	return context;
};
