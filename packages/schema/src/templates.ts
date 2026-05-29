import z from "zod";

export const baseTemplateIds = [
	"azurill",
	"bronzor",
	"chikorita",
	"ditgar",
	"ditto",
	"gengar",
	"glalie",
	"kakuna",
	"lapras",
	"leafish",
	"meowth",
	"onyx",
	"pikachu",
	"rhyhorn",
	"scizor",
] as const;

export type BaseTemplate = (typeof baseTemplateIds)[number];

export const templateVariantFamilies = [
	"executive",
	"ats-classic",
	"tech-lead",
	"product",
	"creative",
	"healthcare",
	"finance",
	"legal",
	"education",
	"engineering",
	"sales",
	"operations",
	"hospitality",
	"construction",
	"entry-level",
	"international",
	"academic",
] as const;

export type TemplateVariantFamily = (typeof templateVariantFamilies)[number];

export type TemplateVariant = `${BaseTemplate}-${TemplateVariantFamily}`;
export type Template = BaseTemplate | TemplateVariant;

export const baseTemplateAccentColors = {
	azurill: "rgba(37, 99, 235, 1)",
	bronzor: "rgba(15, 118, 110, 1)",
	chikorita: "rgba(22, 163, 74, 1)",
	ditgar: "rgba(15, 118, 110, 1)",
	ditto: "rgba(55, 65, 81, 1)",
	gengar: "rgba(124, 58, 237, 1)",
	glalie: "rgba(71, 85, 105, 1)",
	kakuna: "rgba(219, 39, 119, 1)",
	lapras: "rgba(2, 132, 199, 1)",
	leafish: "rgba(101, 128, 72, 1)",
	meowth: "rgba(180, 83, 9, 1)",
	onyx: "rgba(220, 38, 38, 1)",
	pikachu: "rgba(234, 179, 8, 1)",
	rhyhorn: "rgba(82, 82, 91, 1)",
	scizor: "rgba(220, 38, 38, 1)",
} as const satisfies Record<BaseTemplate, string>;

export const templateVariantIds = baseTemplateIds.flatMap((baseTemplate) =>
	templateVariantFamilies.map((variantFamily) => `${baseTemplate}-${variantFamily}` as TemplateVariant),
);

export const templateIds = [...baseTemplateIds, ...templateVariantIds] as [Template, ...Template[]];

export const templateSchema = z.enum(templateIds);

const baseTemplateSet = new Set<string>(baseTemplateIds);

export const isBaseTemplate = (template: string): template is BaseTemplate => baseTemplateSet.has(template);

export const getBaseTemplate = (template: string): BaseTemplate => {
	if (isBaseTemplate(template)) return template;

	const baseTemplate = baseTemplateIds.find((candidate) => template.startsWith(`${candidate}-`));
	return baseTemplate ?? "azurill";
};

export const getTemplateVariantFamily = (template: string): TemplateVariantFamily | null => {
	const baseTemplate = getBaseTemplate(template);
	if (template === baseTemplate) return null;

	const variant = template.slice(baseTemplate.length + 1);
	const matchedFamily = templateVariantFamilies.find((family) => family === variant);
	return matchedFamily ?? null;
};

export const getTemplateAccentColor = (template: string): string => baseTemplateAccentColors[getBaseTemplate(template)];
