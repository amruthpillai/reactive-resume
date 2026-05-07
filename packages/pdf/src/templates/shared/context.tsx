import type { ReactNode } from "react";
import type { StyleInput, TemplatePlacement } from "./styles";
import type {
	SectionTimelineStyleSlots,
	TemplateColorRoles,
	TemplateFeatureStyleSlots,
	TemplateFeatures,
	TemplateIconProps,
	TemplateIconSlot,
	TemplateStyleSlot,
	TemplateStyleSlots,
} from "./types";
import { createContext, useContext } from "react";

type TemplateContextValue = {
	styles: TemplateStyleSlots;
	featureStyles: TemplateFeatureStyleSlots;
	colors: TemplateColorRoles;
	features: TemplateFeatures;
};

type TemplateProviderProps = Omit<TemplateContextValue, "featureStyles" | "features" | "sectionTitleFallbacks"> & {
	featureStyles?: TemplateFeatureStyleSlots;
	features?: TemplateFeatures;
	children: ReactNode;
};

const TemplateContext = createContext<TemplateContextValue | null>(null);
const TemplatePlacementContext = createContext<TemplatePlacement>("main");

const resolveStyleSlot = (slot: TemplateStyleSlot | undefined, context: TemplateStyleContextValue): StyleInput => {
	if (!slot) return undefined;
	if (typeof slot === "function") return slot(context);

	return slot;
};

const resolveIconSlot = (
	slot: TemplateIconSlot | undefined,
	context: TemplateStyleContextValue,
): Partial<TemplateIconProps> => {
	if (!slot) return {};
	if (typeof slot === "function") return slot(context);

	return slot;
};

type TemplateStyleContextValue = {
	placement: TemplatePlacement;
	colors: TemplateColorRoles;
};

export const TemplateProvider = ({
	styles,
	featureStyles = {},
	colors,
	features = {},
	children,
}: TemplateProviderProps) => {
	return (
		<TemplateContext.Provider value={{ styles, featureStyles, colors, features }}>{children}</TemplateContext.Provider>
	);
};

export const TemplatePlacementProvider = ({
	placement,
	children,
}: {
	placement: TemplatePlacement;
	children: ReactNode;
}) => {
	return <TemplatePlacementContext.Provider value={placement}>{children}</TemplatePlacementContext.Provider>;
};

const useTemplateContext = () => {
	const context = useContext(TemplateContext);

	if (!context) throw new Error("useTemplateContext must be called inside a <TemplateProvider>.");

	return context;
};

export const useTemplateFeature = (feature: keyof TemplateFeatures): boolean => {
	const { features } = useTemplateContext();

	return features[feature] ?? false;
};

export const useTemplatePlacement = () => useContext(TemplatePlacementContext);

const useTemplateStyleContext = (): TemplateStyleContextValue => {
	const { colors } = useTemplateContext();
	const placement = useTemplatePlacement();

	return { placement, colors };
};

export const useTemplateStyle = (slot: keyof TemplateStyleSlots): StyleInput => {
	const { styles } = useTemplateContext();
	const context = useTemplateStyleContext();

	return resolveStyleSlot(styles[slot] as TemplateStyleSlot | undefined, context);
};

export const useTemplateFeatureStyle = (
	feature: keyof TemplateFeatureStyleSlots,
	slot: keyof SectionTimelineStyleSlots,
): StyleInput => {
	const { featureStyles } = useTemplateContext();
	const context = useTemplateStyleContext();
	const slots = featureStyles[feature];

	return resolveStyleSlot(slots?.[slot] as TemplateStyleSlot | undefined, context);
};

export const useTemplateIconSlot = (slot: "icon") => {
	const { styles } = useTemplateContext();
	const context = useTemplateStyleContext();

	return resolveIconSlot(styles[slot], context);
};
