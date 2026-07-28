export type SemanticNodeKind =
	| "resume"
	| "page"
	| "region"
	| "header"
	| "picture"
	| "name"
	| "headline"
	| "contact-list"
	| "contact-item"
	| "section"
	| "section-heading"
	| "section-items"
	| "item"
	| "item-header"
	| "field"
	| "link"
	| "icon"
	| "level"
	| "rich-text"
	| "rich-heading"
	| "blockquote"
	| "paragraph"
	| "list"
	| "list-item"
	| "list-item-content"
	| "list-marker"
	| "strong"
	| "emphasis"
	| "underline"
	| "strike"
	| "code"
	| "text-span"
	| "mark"
	| "hard-break"
	| "horizontal-rule"
	| "template-part";

export type SemanticNode = {
	key: string;
	kind: SemanticNodeKind;
	id?: string;
	attributes: Readonly<Record<string, string>>;
	roles: readonly string[];
	children: readonly SemanticNode[];
};
