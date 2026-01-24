type Category = "display" | "handwriting" | "monospace" | "serif" | "sans-serif";

export type Variant =
	| "100"
	| "100italic"
	| "200"
	| "200italic"
	| "300"
	| "300italic"
	| "regular"
	| "italic"
	| "500"
	| "500italic"
	| "600"
	| "600italic"
	| "700"
	| "700italic"
	| "800"
	| "800italic"
	| "900"
	| "900italic";

type Item = {
	kind: "webfonts#webfont";
	menu: string;
	family: string;
	version: string;
	category: Category;
	lastModified: string;
	subsets: string[];
	variants: Variant[];
	colorCapabilities?: string[];
	files: Record<Variant, string>;
};

export type APIResponse = {
	kind: "webfonts#webfontList";
	items: Item[];
};

export type Weight = "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
type FileWeight = Weight | `${Weight}italic`;

export type WebFont = {
	type: "web";
	category: Category;
	family: string;
	weights: Weight[];
	preview: string;
	files: Record<FileWeight, string>;
};
