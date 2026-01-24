import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon, IconContext, type IconProps, WarningIcon } from "@phosphor-icons/react";
import { type RefObject, useMemo, useRef, useState } from "react";
import { match } from "ts-pattern";
import { useResizeObserver } from "usehooks-ts";
import type z from "zod";
import { pageDimensionsAsPixels } from "@/schema/page";
import type { pageLayoutSchema } from "@/schema/resume/data";
import type { Template } from "@/schema/templates";
import { sanitizeCss } from "@/utils/sanitize";
import { cn } from "@/utils/style";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useCSSVariables } from "./hooks/use-css-variables";
import { useWebfonts } from "./hooks/use-webfonts";
import styles from "./preview.module.css";
import { useResumeStore } from "./store/resume";
import { AzurillTemplate } from "./templates/azurill";
import { BronzorTemplate } from "./templates/bronzor";
import { ChikoritaTemplate } from "./templates/chikorita";
import { DitgarTemplate } from "./templates/ditgar";
import { DittoTemplate } from "./templates/ditto";
import { GengarTemplate } from "./templates/gengar";
import { GlalieTemplate } from "./templates/glalie";
import { KakunaTemplate } from "./templates/kakuna";
import { LaprasTemplate } from "./templates/lapras";
import { LeafishTemplate } from "./templates/leafish";
import { OnyxTemplate } from "./templates/onyx";
import { PikachuTemplate } from "./templates/pikachu";
import { RhyhornTemplate } from "./templates/rhyhorn";

export type ExtendedIconProps = IconProps & {
	hidden?: boolean;
};

const CSS_RULE_SPLIT_PATTERN = /\n(?=\s*[.#a-zA-Z])/;
const CSS_SELECTOR_PATTERN = /^([^{]+)(\{)/;

function getTemplateComponent(template: Template) {
	return match(template)
		.with("azurill", () => AzurillTemplate)
		.with("bronzor", () => BronzorTemplate)
		.with("chikorita", () => ChikoritaTemplate)
		.with("ditto", () => DittoTemplate)
		.with("ditgar", () => DitgarTemplate)
		.with("gengar", () => GengarTemplate)
		.with("glalie", () => GlalieTemplate)
		.with("kakuna", () => KakunaTemplate)
		.with("lapras", () => LaprasTemplate)
		.with("leafish", () => LeafishTemplate)
		.with("onyx", () => OnyxTemplate)
		.with("pikachu", () => PikachuTemplate)
		.with("rhyhorn", () => RhyhornTemplate)
		.exhaustive();
}

type Props = React.ComponentProps<"div"> & {
	pageClassName?: string;
	showPageNumbers?: boolean;
};

export const ResumePreview = ({ showPageNumbers = false, pageClassName, className, ...props }: Props) => {
	const picture = useResumeStore((state) => state.resume.data.picture);
	const metadata = useResumeStore((state) => state.resume.data.metadata);

	useWebfonts(metadata.typography);
	const style = useCSSVariables({ picture, metadata });

	const iconProps = useMemo<ExtendedIconProps>(() => {
		return {
			weight: "regular",
			hidden: metadata.page.hideIcons,
			color: "var(--page-primary-color)",
			size: metadata.typography.body.fontSize * 1.5,
		} satisfies ExtendedIconProps;
	}, [metadata.typography.body.fontSize, metadata.page.hideIcons]);

	const scopedCSS = useMemo(() => {
		if (!metadata.css.enabled || !metadata.css.value.trim()) return null;

		const sanitizedCss = sanitizeCss(metadata.css.value);

		const scoped = sanitizedCss
			.split(CSS_RULE_SPLIT_PATTERN)
			.map((rule) => {
				const trimmed = rule.trim();
				if (!trimmed || trimmed.startsWith("@")) return trimmed;

				return trimmed.replace(CSS_SELECTOR_PATTERN, (_match, selectors, brace) => {
					const prefixed = selectors
						.split(",")
						.map((selector: string) => `.resume-preview-container ${selector.trim()} `)
						.join(", ");
					return `${prefixed}${brace}`;
				});
			})
			.join("\n");

		return scoped;
	}, [metadata.css.enabled, metadata.css.value]);

	return (
		<IconContext.Provider value={iconProps}>
			{/** biome-ignore lint/security/noDangerouslySetInnerHtml: CSS is sanitized with sanitizeCss */}
			{scopedCSS && <style dangerouslySetInnerHTML={{ __html: scopedCSS }} />}

			<div style={style} className={cn("resume-preview-container", className)} {...props}>
				{metadata.layout.pages.map((pageLayout, pageIndex) => (
					<PageContainer
						key={pageIndex}
						pageIndex={pageIndex}
						pageLayout={pageLayout}
						pageClassName={pageClassName}
						showPageNumbers={showPageNumbers}
					/>
				))}
			</div>
		</IconContext.Provider>
	);
};

type PageContainerProps = {
	pageIndex: number;
	pageLayout: z.infer<typeof pageLayoutSchema>;
	pageClassName?: string;
	showPageNumbers?: boolean;
};

function PageContainer({ pageIndex, pageLayout, pageClassName, showPageNumbers = false }: PageContainerProps) {
	const pageRef = useRef<HTMLDivElement>(null);
	const [pageHeight, setPageHeight] = useState<number>(0);

	const metadata = useResumeStore((state) => state.resume.data.metadata);

	const pageNumber = useMemo(() => pageIndex + 1, [pageIndex]);
	const maxPageHeight = useMemo(() => pageDimensionsAsPixels[metadata.page.format].height, [metadata.page.format]);
	const totalNumberOfPages = useMemo(() => metadata.layout.pages.length, [metadata.layout.pages]);
	const TemplateComponent = useMemo(() => getTemplateComponent(metadata.template), [metadata.template]);

	useResizeObserver({
		ref: pageRef as RefObject<HTMLDivElement>,
		onResize: (size) => {
			if (!size.height) return;
			setPageHeight(size.height);
		},
	});

	return (
		<div data-page-index={pageIndex} className="relative">
			{showPageNumbers && totalNumberOfPages > 1 && (
				<div className="absolute -top-6 left-0 print:hidden">
					<span className="font-medium text-foreground text-xs">
						<Trans>
							Page {pageNumber} of {totalNumberOfPages}
						</Trans>
					</span>
				</div>
			)}

			<div ref={pageRef} className={cn(`page page-${pageIndex}`, styles.page, pageClassName)}>
				<TemplateComponent pageIndex={pageIndex} pageLayout={pageLayout} />
			</div>

			{pageHeight > maxPageHeight && (
				<div className="absolute top-full left-0 mt-4 print:hidden">
					<a
						rel="noopener"
						target="_blank"
						className="group/link"
						href="https://docs.rxresu.me/guides/fitting-content-on-a-page"
					>
						<Alert className="max-w-sm text-yellow-600">
							<WarningIcon color="currentColor" />
							<AlertTitle>
								<Trans>
									The content is too tall for this page, this may cause undesirable results when exporting to PDF.
								</Trans>
							</AlertTitle>
							<AlertDescription className="text-xs underline-offset-2 group-hover/link:underline">
								<Trans>Learn more about how to fit content on a page</Trans>
								<ArrowRightIcon color="currentColor" className="ml-1 inline size-3" />
							</AlertDescription>
						</Alert>
					</a>
				</div>
			)}
		</div>
	);
}
