import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { ReactNode } from "react";
import type { SectionTitleResolver } from "./section-title";
import { createContext, use, useMemo } from "react";
import { isRTL } from "@reactive-resume/utils/locale";

type RenderContextValue = ResumeData & {
	resolveSectionTitle?: SectionTitleResolver | undefined;
	rtl: boolean;
};

const RenderContext = createContext<RenderContextValue | null>(null);

export type RenderProviderProps = {
	data: ResumeData;
	resolveSectionTitle?: SectionTitleResolver | undefined;
	children: ReactNode;
};

export const RenderProvider = ({ data, resolveSectionTitle, children }: RenderProviderProps) => {
	const rtl = isRTL(data.metadata.page.locale);
	const contextValue = useMemo<RenderContextValue>(
		() => ({ ...data, resolveSectionTitle, rtl }),
		[data, resolveSectionTitle, rtl],
	);

	return <RenderContext.Provider value={contextValue}>{children}</RenderContext.Provider>;
};

export const useRender = (): RenderContextValue => {
	const context = use(RenderContext);

	if (!context) throw new Error("useRender must be called inside a <RenderProvider>.");

	return context;
};
