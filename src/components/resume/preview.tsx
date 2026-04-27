import type z from "zod";

import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon, IconContext, type IconProps, WarningIcon } from "@phosphor-icons/react";
import { type RefObject, useMemo, useRef, useState } from "react";
import { match } from "ts-pattern";
import { useResizeObserver } from "usehooks-ts";

import type { pageLayoutSchema } from "@/schema/resume/data";
import type { Template } from "@/schema/templates";

import { pageDimensionsAsPixels } from "@/schema/page";
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
import { MeowthTemplate } from "./templates/meowth";
import { OnyxTemplate } from "./templates/onyx";
import { PikachuTemplate } from "./templates/pikachu";
import { RhyhornTemplate } from "./templates/rhyhorn";

export type ExtendedIconProps = IconProps & {
  hidden?: boolean;
};

function scopeCustomCssSelectors(css: string): string {
  // keep @keyframes blocks unchanged, scope the remaining rule selectors
  const keyframes: string[] = [];
  const withoutKeyframes = css.replace(/@(-webkit-)?keyframes\s+[^{]+\{[\s\S]*?\}\s*\}/gi, (block) => {
    keyframes.push(block);
    return `__RR_KEYFRAMES_${keyframes.length - 1}__`;
  });

  const scoped = withoutKeyframes.replace(/(^|})\s*([^@{}][^{]+)\{/g, (_match, prefix, rawSelectors) => {
    const selectors = rawSelectors
      .split(",")
      .map((selector: string) => selector.trim())
      .filter(Boolean)
      .map((selector: string) => `.resume-preview-container ${selector}`)
      .join(", ");
    if (!selectors) return `${prefix}${rawSelectors}{`;
    return `${prefix} ${selectors}{`;
  });

  const restored = scoped.replace(/__RR_KEYFRAMES_(\d+)__/g, (_match, index) => keyframes[Number(index)] ?? "");

  return restored;
}

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
    .with("meowth", () => MeowthTemplate)
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
    return scopeCustomCssSelectors(sanitizedCss);
  }, [metadata.css.enabled, metadata.css.value]);

  return (
    <IconContext.Provider value={iconProps}>
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

  const pageNumber = pageIndex + 1;
  const maxPageHeight = pageDimensionsAsPixels[metadata.page.format].height;
  const totalNumberOfPages = metadata.layout.pages.length;
  const TemplateComponent = getTemplateComponent(metadata.template);

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
        <div className="absolute inset-s-0 -top-6 print:hidden">
          <span className="text-xs font-medium text-foreground">
            <Trans comment="Page counter label shown above resume preview pages">
              Page {pageNumber} of {totalNumberOfPages}
            </Trans>
          </span>
        </div>
      )}

      <div ref={pageRef} className={cn(`page page-${pageIndex}`, styles.page, pageClassName)}>
        <TemplateComponent pageIndex={pageIndex} pageLayout={pageLayout} />
      </div>

      {metadata.page.format !== "free-form" && pageHeight > maxPageHeight && (
        <div className="absolute inset-s-0 top-full mt-4 print:hidden">
          <a
            rel="noopener"
            target="_blank"
            className="group/link"
            href="https://docs.rxresu.me/guides/fitting-content-on-a-page"
          >
            <Alert className="max-w-sm text-yellow-600">
              <WarningIcon color="currentColor" />
              <AlertTitle>
                <Trans comment="Warning shown when resume content exceeds printable page height">
                  The content is too tall for this page, this may cause undesirable results when exporting to PDF.
                </Trans>
              </AlertTitle>
              <AlertDescription className="text-xs underline-offset-2 group-hover/link:underline">
                <Trans comment="Help link text to documentation about fitting resume content onto a page">
                  Learn more about how to fit content on a page
                </Trans>
                <ArrowRightIcon color="currentColor" className="ms-1 inline size-3" />
              </AlertDescription>
            </Alert>
          </a>
        </div>
      )}
    </div>
  );
}
