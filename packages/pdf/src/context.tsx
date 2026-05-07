import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { ReactNode } from "react";
import type { SectionTitleResolver } from "./section-title";
import { createContext, useContext } from "react";

type RenderContextValue = ResumeData & {
	resolveSectionTitle?: SectionTitleResolver | undefined;
};

const RenderContext = createContext<RenderContextValue | null>(null);

export type RenderProviderProps = {
	data: ResumeData;
	resolveSectionTitle?: SectionTitleResolver | undefined;
	children: ReactNode;
};

export const RenderProvider = ({ data, resolveSectionTitle, children }: RenderProviderProps) => {
	return <RenderContext.Provider value={{ ...data, resolveSectionTitle }}>{children}</RenderContext.Provider>;
};

export const useRender = (): RenderContextValue => {
	const context = useContext(RenderContext);

	if (!context) throw new Error("useRender must be called inside a <RenderProvider>.");

	return context;
};
