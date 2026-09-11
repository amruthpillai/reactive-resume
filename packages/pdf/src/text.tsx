import type { ComponentProps, ReactElement, ReactNode } from "react";
import type { Html as RendererHtml } from "react-pdf-html";
import { cloneElement, isValidElement } from "react";
import { renderHtml } from "react-pdf-html";
import { Link as RendererLink, Text as RendererText } from "#react-pdf-renderer";
import { useRender } from "./context";

type TextProps = ComponentProps<typeof RendererText>;
type LinkProps = ComponentProps<typeof RendererLink>;
type HtmlProps = ComponentProps<typeof RendererHtml>;

export function Text(props: TextProps) {
	const { hyphenationCallback } = useRender();
	return <RendererText hyphenationCallback={hyphenationCallback} {...props} />;
}

export function Link(props: LinkProps) {
	const { hyphenationCallback } = useRender();
	// React PDF lays out text-only links as Text nodes. Its Link type omits this
	// supported layout prop, so forward the same per-document text options.
	const textOptions = { hyphenationCallback };
	return <RendererLink {...textOptions} {...props} />;
}

/** react-pdf-html creates native Text buckets outside our Text component. */
function applyDocumentHyphenation(
	node: ReactNode,
	hyphenationCallback: NonNullable<TextProps["hyphenationCallback"]>,
): ReactNode {
	if (Array.isArray(node)) return node.map((child) => applyDocumentHyphenation(child, hyphenationCallback));
	if (!isValidElement(node)) return node;
	const element = node as ReactElement<{
		children?: ReactNode;
		hyphenationCallback?: TextProps["hyphenationCallback"];
	}>;
	const props = element.type === RendererText || element.type === RendererLink ? { hyphenationCallback } : {};
	return cloneElement(element, props, applyDocumentHyphenation(element.props.children, hyphenationCallback));
}

export function Html(props: HtmlProps) {
	const { hyphenationCallback } = useRender();
	return applyDocumentHyphenation(renderHtml(props.children, props), hyphenationCallback);
}
