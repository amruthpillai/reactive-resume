import type { Style } from "@react-pdf/types";
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { Html } from "react-pdf-html";
import { isRTL } from "@reactive-resume/utils/locale";
import { useRender } from "../../context";
import { Text as PdfText, View } from "../../renderer";
import { useTemplateStyle } from "./context";
import { safeTextStyle } from "./primitives";
import {
  convertPseudoBulletParagraphs,
  normalizeRichTextHtml,
  richTextMarkClassName,
} from "./rich-text-html";
import {
  createRichTextProseSpacing,
  getRichTextEdgeTrimStyle,
  isRichTextElementInsideListItem,
  isRichTextElementInsideOrderedList,
  resolveRichTextBodyLineHeight,
  stripRichTextVerticalMargins,
} from "./rich-text-spacing";
import { composeStyles, mergeLinkStyles, mergeStyles } from "./styles";

const richListItemContentStackStyle = {
  flexDirection: "column",
} satisfies Style;

const richMarkStyle = {
  backgroundColor: "#ffff00",
} satisfies Style;

const toStyleArray = (style: Style | Style[] | undefined): Style[] => {
  if (!style) return [];
  if (Array.isArray(style)) return style.filter(Boolean);

  return [style];
};

// react-pdf textkit reads BiDi base direction from each run's own `direction` attribute
// (default "ltr"), and react-pdf-html buckets inline content into styleless inner <Text>
// frames — so the rtl style has to be injected onto every descendant, not just a wrapper.
const applyRtlDirectionRecursively = (node: ReactNode): ReactNode => {
  if (Array.isArray(node)) {
    return node.map((child, i) => {
      const cloned = applyRtlDirectionRecursively(child);
      if (isValidElement(cloned) && cloned.key == null) {
        return cloneElement(cloned as ReactElement<{ key?: string }>, {
          key: `rtl-${i}`,
        });
      }
      return cloned;
    });
  }
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<{
    style?: Style | Style[];
    children?: ReactNode;
  }>;
  const existingStyle = element.props.style;
  const rtlPatch: Style = { direction: "rtl", textAlign: "right" };
  const nextStyle: Style | Style[] = Array.isArray(existingStyle)
    ? [...existingStyle, rtlPatch]
    : existingStyle
      ? [existingStyle, rtlPatch]
      : rtlPatch;
  const nextChildren = applyRtlDirectionRecursively(element.props.children);
  return cloneElement(element, { style: nextStyle }, nextChildren);
};

export const RichText = ({ children }: { children: string }) => {
  const data = useRender();
  const rtl = isRTL(data.metadata.page.locale);
  const rtlTextWrapStyle: Style | undefined = rtl
    ? { direction: "rtl", textAlign: "right" }
    : undefined;
  const boldStyle = useTemplateStyle("bold");
  const linkStyle = useTemplateStyle("link");
  const richParagraphStyle = useTemplateStyle("richParagraph");
  const richListItemRowStyle = useTemplateStyle("richListItemRow");
  const richListItemMarkerStyle = useTemplateStyle("richListItemMarker");
  const richListItemContentStyle = useTemplateStyle("richListItemContent");
  const bodyLineHeight = resolveRichTextBodyLineHeight(
    richParagraphStyle,
    richListItemContentStyle,
  );
  const proseSpacing = createRichTextProseSpacing(bodyLineHeight);

  const normalized = normalizeRichTextHtml(children);
  // RTL-only: pseudo-bullets share one BiDi paragraph across <br>, causing chars to
  // bleed between visual lines. Real <li> items are independent BiDi paragraphs.
  const withBullets =
    normalized && rtl ? convertPseudoBulletParagraphs(normalized) : normalized;
  // Inject U+200F (RLM) after each <p>/<li> opener to anchor BiDi base direction
  // on the inner styleless <Text> frame react-pdf-html creates.
  const html =
    withBullets && rtl
      ? withBullets.replace(
        /<(p|li)\b([^>]*)>/gi,
        (_match, tag, rest) => `<${tag}${rest}>‏`,
      )
      : withBullets;

  if (!html) return null;

  return (
    <Html
      resetStyles
      renderers={{
        b: ({ children }) => (
          <PdfText style={composeStyles(boldStyle, safeTextStyle)}>
            {children}
          </PdfText>
        ),
        p: ({ element, style, children }) => {
          const paragraphStyles = isRichTextElementInsideListItem(element)
            ? toStyleArray(style).map(stripRichTextVerticalMargins)
            : style;

          if (rtl) {
            return (
              <PdfText
                style={composeStyles(
                  paragraphStyles,
                  getRichTextEdgeTrimStyle(element),
                  rtlTextWrapStyle,
                )}
              >
                {applyRtlDirectionRecursively(children)}
              </PdfText>
            );
          }

          return (
            <View
              style={composeStyles(
                paragraphStyles,
                getRichTextEdgeTrimStyle(element),
              )}
            >
              {children}
            </View>
          );
        },
        li: ({ element, style, children }) => {
          const isOrderedList = isRichTextElementInsideOrderedList(element);
          const marker = isOrderedList ? `${element.indexOfType + 1}.` : "•";
          const itemStyles = toStyleArray(style);
          const contentItemStyles = itemStyles.map(
            stripRichTextVerticalMargins,
          );

          const markerNode = (
            <PdfText
              key="marker"
              style={composeStyles(richListItemMarkerStyle)}
            >
              {marker}
            </PdfText>
          );
          // Same BiDi-injection trick as the <p> renderer — see applyRtlDirectionRecursively.
          const contentNode = rtl ? (
            <PdfText
              key="content"
              style={composeStyles(
                richListItemContentStyle,
                contentItemStyles,
                safeTextStyle,
                rtlTextWrapStyle,
              )}
            >
              {applyRtlDirectionRecursively(children)}
            </PdfText>
          ) : (
            <View
              key="content"
              style={composeStyles(
                richListItemContentStyle,
                contentItemStyles,
                richListItemContentStackStyle,
                safeTextStyle,
              )}
            >
              {children}
            </View>
          );

          // Yoga ignores `flexDirection`/`direction` on rows inside react-pdf-html's <ul>
          // (works fine for split-row/contact-list). Swap DOM order to position the marker.
          return (
            <View
              style={composeStyles(
                richListItemRowStyle,
                itemStyles,
                getRichTextEdgeTrimStyle(element),
              )}
            >
              {rtl ? [contentNode, markerNode] : [markerNode, contentNode]}
            </View>
          );
        },
      }}
      stylesheet={{
        b: mergeStyles(boldStyle, safeTextStyle),
        strong: mergeStyles(boldStyle, safeTextStyle),
        li: mergeStyles(proseSpacing.listItem),
        [`.${richTextMarkClassName}`]: mergeStyles(
          richMarkStyle,
          safeTextStyle,
        ),
        p: mergeStyles(
          richParagraphStyle,
          safeTextStyle,
          proseSpacing.paragraph,
        ),
        a: mergeLinkStyles(linkStyle, safeTextStyle),
      }}
    >
      {html}
    </Html>
  );
};
