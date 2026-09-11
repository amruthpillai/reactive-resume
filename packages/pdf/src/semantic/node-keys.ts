export type CombinedTextName =
	| "experience-position-location"
	| "experience-location"
	| "experience-period"
	| "education-area-degree"
	| "education-degree-grade"
	| "education-location-period"
	| "education-grade-location";

export type SemanticNodeKeyFactory = {
	resume: () => string;
	page: (pageNumber: number) => string;
	region: (pageKey: string, region: string) => string;
	header: (regionKey: string) => string;
	headerPart: (headerKey: string, kind: "picture" | "name" | "headline") => string;
	contactList: (headerKey: string) => string;
	contactItem: (contactListKey: string, name: string, id?: string) => string;
	section: (regionKey: string, id: string) => string;
	sectionHeading: (sectionKey: string) => string;
	sectionItems: (sectionKey: string) => string;
	item: (parentKey: string, id: string) => string;
	itemHeader: (itemKey: string) => string;
	combinedText: (parentKey: string, name: CombinedTextName) => string;
	field: (parentKey: string, name: string) => string;
	link: (parentKey: string, role: string) => string;
	icon: (parentKey: string, role: string) => string;
	level: (parentKey: string) => string;
	richText: (parentKey: string, name: string) => string;
	richTextNode: (parentKey: string, kind: string, index: number) => string;
};

const encodeKeyPart = (value: string | number): string => encodeURIComponent(String(value)).replaceAll("~", "%7E");
const childKey = (parentKey: string, segment: string): string => `${parentKey}/${segment}`;

export const semanticNodeKeys: SemanticNodeKeyFactory = {
	resume: () => "resume",
	page: (pageNumber) => `page-${encodeKeyPart(pageNumber)}`,
	region: (pageKey, region) => childKey(pageKey, `region-${encodeKeyPart(region)}`),
	header: (regionKey) => childKey(regionKey, "header"),
	headerPart: (headerKey, kind) => childKey(headerKey, kind),
	contactList: (headerKey) => childKey(headerKey, "contact-list"),
	contactItem: (contactListKey, name, id) =>
		childKey(contactListKey, `contact-${encodeKeyPart(name)}${id === undefined ? "" : `~${encodeKeyPart(id)}`}`),
	section: (regionKey, id) => childKey(regionKey, `section-${encodeKeyPart(id)}`),
	sectionHeading: (sectionKey) => childKey(sectionKey, "section-heading"),
	sectionItems: (sectionKey) => childKey(sectionKey, "section-items"),
	item: (parentKey, id) => childKey(parentKey, `item-${encodeKeyPart(id)}`),
	itemHeader: (itemKey) => childKey(itemKey, "item-header"),
	combinedText: (parentKey, name) => childKey(parentKey, `combined-text-${encodeKeyPart(name)}`),
	field: (parentKey, name) => childKey(parentKey, `field-${encodeKeyPart(name)}`),
	link: (parentKey, role) => childKey(parentKey, `link-${encodeKeyPart(role)}`),
	icon: (parentKey, role) => childKey(parentKey, `icon-${encodeKeyPart(role)}`),
	level: (parentKey) => childKey(parentKey, "level"),
	richText: (parentKey, name) => childKey(parentKey, `rich-text-${encodeKeyPart(name)}`),
	richTextNode: (parentKey, kind, index) => childKey(parentKey, `${encodeKeyPart(kind)}-${encodeKeyPart(index)}`),
};
