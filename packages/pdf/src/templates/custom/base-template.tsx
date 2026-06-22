import type { Style } from "@react-pdf/types";
import type { Template } from "@reactive-resume/schema/templates";
import type { ComponentProps, ReactNode } from "react";
import type {
	TemplateColorRoles,
	TemplateFeatureStyleSlots,
	TemplateFeatures,
	TemplateStyleSlots,
} from "../shared/types";
import { Page } from "../../renderer";
import { useAzurillTemplate } from "../azurill/AzurillPage";
import { useBronzorTemplate } from "../bronzor/BronzorPage";
import { useChikoritaTemplate } from "../chikorita/ChikoritaPage";
import { useDitgarTemplate } from "../ditgar/DitgarPage";
import { useDittoTemplate } from "../ditto/DittoPage";
import { useGengarTemplate } from "../gengar/GengarPage";
import { useGlalieTemplate } from "../glalie/GlaliePage";
import { useKakunaTemplate } from "../kakuna/KakunaPage";
import { useLaprasTemplate } from "../lapras/LaprasPage";
import { useLeafishTemplate } from "../leafish/LeafishPage";
import { useMeowthTemplate } from "../meowth/MeowthPage";
import { useOnyxTemplate } from "../onyx/OnyxPage";
import { usePikachuTemplate } from "../pikachu/PikachuPage";
import { useRhyhornTemplate } from "../rhyhorn/RhyhornPage";
import { useScizorTemplate } from "../scizor/ScizorPage";
import { TemplateProvider } from "../shared/context";
import { composeStyles } from "../shared/styles";

// ─── Base-template frames ─────────────────────────────────────────────────────
//
// A custom template renders its own node tree, but to look like the template it
// is "based on" it must use that template's real styling. Each built-in template
// exposes a `use<Name>Template()` hook returning its `{ styles, colors, ... }`.
// We wrap each in a "frame" component that opens the base template's <Page> and
// <TemplateProvider> and renders the custom node tree as children — so the shared
// <Section>/<Heading>/<Icon> primitives pick up the base template's section and
// heading styling, colors, typography, and features (e.g. timelines).
//
// Selecting a frame component by `baseTemplate` (rather than calling a hook
// conditionally) keeps the Rules of Hooks intact — same pattern as
// `getTemplatePage`.

type TemplateStyleResult = {
	colors: TemplateColorRoles;
	styles: TemplateStyleSlots & { page?: Style };
	features?: TemplateFeatures;
	featureStyles?: TemplateFeatureStyleSlots;
};

export type TemplateFrameProps = {
	pageSize: NonNullable<ComponentProps<typeof Page>["size"]>;
	pageMinHeightStyle: Style | undefined;
	pageStyle?: Style;
	children: ReactNode;
};

const makeFrame = (useTemplate: () => TemplateStyleResult) =>
	function TemplateFrame({ pageSize, pageMinHeightStyle, pageStyle, children }: TemplateFrameProps) {
		const { styles, colors, features, featureStyles } = useTemplate();
		return (
			<Page size={pageSize} style={composeStyles(styles.page, pageMinHeightStyle, pageStyle)}>
				<TemplateProvider
					styles={styles}
					colors={colors}
					{...(features ? { features } : {})}
					{...(featureStyles ? { featureStyles } : {})}
				>
					{children}
				</TemplateProvider>
			</Page>
		);
	};

// Each hook returns a template-specific superset of TemplateStyleSlots; the cast
// narrows them to the common shape the frame consumes.
const asResult = (hook: () => unknown) => hook as () => TemplateStyleResult;

// ─── DOM style providers ──────────────────────────────────────────────────────
//
// The web template editor reuses these to render its HTML canvas with the base
// template's REAL resolved styles (translated to CSS), so the canvas matches the
// PDF. A style provider just exposes the base template's `{ styles, colors }`
// through <TemplateProvider> (pure React context — no react-pdf rendering), so
// DOM components under it can call `useTemplateStyle("section")` etc.

const makeStyleProvider = (useTemplate: () => TemplateStyleResult) =>
	function BaseTemplateStyleProvider({ children }: { children: ReactNode }) {
		const { styles, colors, features, featureStyles } = useTemplate();
		return (
			<TemplateProvider
				styles={styles}
				colors={colors}
				{...(features ? { features } : {})}
				{...(featureStyles ? { featureStyles } : {})}
			>
				{children}
			</TemplateProvider>
		);
	};

const onyxStyleProvider = makeStyleProvider(asResult(useOnyxTemplate));

const STYLE_PROVIDERS: Partial<Record<Template, (props: { children: ReactNode }) => ReactNode>> = {
	azurill: makeStyleProvider(asResult(useAzurillTemplate)),
	bronzor: makeStyleProvider(asResult(useBronzorTemplate)),
	chikorita: makeStyleProvider(asResult(useChikoritaTemplate)),
	ditgar: makeStyleProvider(asResult(useDitgarTemplate)),
	ditto: makeStyleProvider(asResult(useDittoTemplate)),
	gengar: makeStyleProvider(asResult(useGengarTemplate)),
	glalie: makeStyleProvider(asResult(useGlalieTemplate)),
	kakuna: makeStyleProvider(asResult(useKakunaTemplate)),
	lapras: makeStyleProvider(asResult(useLaprasTemplate)),
	leafish: makeStyleProvider(asResult(useLeafishTemplate)),
	meowth: makeStyleProvider(asResult(useMeowthTemplate)),
	onyx: onyxStyleProvider,
	pikachu: makeStyleProvider(asResult(usePikachuTemplate)),
	rhyhorn: makeStyleProvider(asResult(useRhyhornTemplate)),
	scizor: makeStyleProvider(asResult(useScizorTemplate)),
};

export const getBaseStyleProvider = (template: Template) => STYLE_PROVIDERS[template] ?? onyxStyleProvider;

export { TemplatePlacementProvider, useTemplateIconSlot, useTemplateStyle } from "../shared/context";

// Onyx is the default fallback (mirrors `defaultTemplatePage`'s role).
const onyxFrame = makeFrame(asResult(useOnyxTemplate));

const TEMPLATE_FRAMES: Partial<Record<Template, (props: TemplateFrameProps) => ReactNode>> = {
	azurill: makeFrame(asResult(useAzurillTemplate)),
	bronzor: makeFrame(asResult(useBronzorTemplate)),
	chikorita: makeFrame(asResult(useChikoritaTemplate)),
	ditgar: makeFrame(asResult(useDitgarTemplate)),
	ditto: makeFrame(asResult(useDittoTemplate)),
	gengar: makeFrame(asResult(useGengarTemplate)),
	glalie: makeFrame(asResult(useGlalieTemplate)),
	kakuna: makeFrame(asResult(useKakunaTemplate)),
	lapras: makeFrame(asResult(useLaprasTemplate)),
	leafish: makeFrame(asResult(useLeafishTemplate)),
	meowth: makeFrame(asResult(useMeowthTemplate)),
	onyx: onyxFrame,
	pikachu: makeFrame(asResult(usePikachuTemplate)),
	rhyhorn: makeFrame(asResult(useRhyhornTemplate)),
	scizor: makeFrame(asResult(useScizorTemplate)),
};

export const getTemplateFrame = (template: Template) => TEMPLATE_FRAMES[template] ?? onyxFrame;
