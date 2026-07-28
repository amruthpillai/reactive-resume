import type { SemanticNodeKind } from "../types";
import { SEMANTIC_NODE_KINDS } from "./semantic";

export type PropertyDefinition = {
	category:
		| "flexbox"
		| "layout"
		| "dimension"
		| "color"
		| "text"
		| "image"
		| "spacing"
		| "border"
		| "transform"
		| "structural";
	inheritable: boolean;
	appliesTo: readonly SemanticNodeKind[];
};

export type PropertyRegistry = Readonly<Record<string, PropertyDefinition | undefined>>;

const containerNodes = [
	"page",
	"region",
	"header",
	"contact-list",
	"contact-item",
	"section",
	"section-items",
	"item",
	"item-header",
	"rich-text",
	"list",
	"list-item",
	"horizontal-rule",
	"template-part",
] as const satisfies readonly SemanticNodeKind[];

const textNodes = [
	"name",
	"headline",
	"section-heading",
	"field",
	"rich-heading",
	"blockquote",
	"paragraph",
	"list-item-content",
	"list-marker",
	"strong",
	"emphasis",
	"underline",
	"strike",
	"code",
	"text-span",
	"mark",
	"hard-break",
] as const satisfies readonly SemanticNodeKind[];

const linkContainerNodes = [...containerNodes, "link"] as SemanticNodeKind[];
const textAndLinkNodes = [...textNodes, "link"] as SemanticNodeKind[];
const colorNodes = [...containerNodes, ...textNodes, "link", "icon", "level"] as SemanticNodeKind[];
const spacingNodes = [...containerNodes, ...textNodes, "link", "picture"] as SemanticNodeKind[];
const structuralNodes = [...SEMANTIC_NODE_KINDS.filter((kind) => kind !== "resume")] as SemanticNodeKind[];

function entries(
	names: readonly string[],
	definition: PropertyDefinition,
): Readonly<Record<string, PropertyDefinition | undefined>> {
	return Object.fromEntries(names.map((name) => [name, definition]));
}

const properties = {
	...entries(
		[
			"align-content",
			"align-items",
			"align-self",
			"flex",
			"flex-direction",
			"flex-wrap",
			"flex-flow",
			"flex-grow",
			"flex-shrink",
			"flex-basis",
			"justify-content",
			"gap",
			"row-gap",
			"column-gap",
		],
		{ category: "flexbox", inheritable: false, appliesTo: linkContainerNodes },
	),
	...entries(["aspect-ratio", "bottom", "display", "left", "position", "right", "top", "overflow", "z-index"], {
		category: "layout",
		inheritable: false,
		appliesTo: linkContainerNodes,
	}),
	...entries(["width", "height", "min-width", "min-height", "max-width", "max-height"], {
		category: "dimension",
		inheritable: false,
		appliesTo: [...linkContainerNodes, "picture"],
	}),
	...entries(["color"], { category: "color", inheritable: true, appliesTo: colorNodes }),
	...entries(["background-color"], { category: "color", inheritable: false, appliesTo: linkContainerNodes }),
	...entries(["opacity"], { category: "color", inheritable: false, appliesTo: colorNodes }),
	...entries(["direction"], { category: "text", inheritable: true, appliesTo: textAndLinkNodes }),
	...entries(["font-size"], {
		category: "text",
		inheritable: true,
		appliesTo: [...textAndLinkNodes, "icon", "level"],
	}),
	...entries(["font-style", "font-weight", "letter-spacing", "line-height"], {
		category: "text",
		inheritable: true,
		appliesTo: textAndLinkNodes,
	}),
	...entries(["max-lines"], { category: "text", inheritable: false, appliesTo: textAndLinkNodes }),
	...entries(["text-align"], { category: "text", inheritable: true, appliesTo: textAndLinkNodes }),
	...entries(["text-decoration", "text-decoration-color", "text-decoration-style"], {
		category: "text",
		inheritable: false,
		appliesTo: textAndLinkNodes,
	}),
	...entries(["text-indent"], { category: "text", inheritable: true, appliesTo: textAndLinkNodes }),
	...entries(["text-overflow"], { category: "text", inheritable: false, appliesTo: textAndLinkNodes }),
	...entries(["text-transform"], { category: "text", inheritable: true, appliesTo: textAndLinkNodes }),
	...entries(["vertical-align"], { category: "text", inheritable: false, appliesTo: textAndLinkNodes }),
	...entries(["object-fit", "object-position"], { category: "image", inheritable: false, appliesTo: ["picture"] }),
	...entries(["-rr-shadow-color", "-rr-shadow-width"], {
		category: "image",
		inheritable: false,
		appliesTo: ["picture"],
	}),
	...entries(
		[
			"margin",
			"margin-top",
			"margin-right",
			"margin-bottom",
			"margin-left",
			"margin-horizontal",
			"margin-vertical",
			"padding",
			"padding-top",
			"padding-right",
			"padding-bottom",
			"padding-left",
			"padding-horizontal",
			"padding-vertical",
		],
		{ category: "spacing", inheritable: false, appliesTo: spacingNodes },
	),
	...entries(
		[
			"border",
			"border-color",
			"border-style",
			"border-width",
			"border-top",
			"border-right",
			"border-bottom",
			"border-left",
			"border-top-color",
			"border-top-style",
			"border-top-width",
			"border-right-color",
			"border-right-style",
			"border-right-width",
			"border-bottom-color",
			"border-bottom-style",
			"border-bottom-width",
			"border-left-color",
			"border-left-style",
			"border-left-width",
			"border-radius",
			"border-top-left-radius",
			"border-top-right-radius",
			"border-bottom-right-radius",
			"border-bottom-left-radius",
		],
		{ category: "border", inheritable: false, appliesTo: [...linkContainerNodes, "picture"] },
	),
	...entries(["transform", "transform-origin"], {
		category: "transform",
		inheritable: false,
		appliesTo: [...linkContainerNodes, "picture"],
	}),
	...entries(["order", "break-before", "break-inside"], {
		category: "structural",
		inheritable: false,
		appliesTo: structuralNodes,
	}),
	...entries(["orphans", "widows"], { category: "structural", inheritable: false, appliesTo: textNodes }),
	...entries(["size"], { category: "structural", inheritable: false, appliesTo: ["page"] }),
	...entries(["-rr-fixed"], { category: "structural", inheritable: false, appliesTo: structuralNodes }),
	...entries(["-rr-min-presence-ahead"], {
		category: "structural",
		inheritable: false,
		appliesTo: structuralNodes,
	}),
} satisfies PropertyRegistry;

export const PROPERTY_REGISTRY_V1: PropertyRegistry = properties;
