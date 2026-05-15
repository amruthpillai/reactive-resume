const productionRootUrl = "https://rxresu.me/";
const appName = "Reactive Resume";
const repositoryUrl = "https://github.com/amruthpillai/reactive-resume";

type JsonLd = Record<string, unknown>;

export const getCanonicalRootUrl = (origin?: string): string => {
	if (!origin) return productionRootUrl;

	const url = new URL(origin);
	url.pathname = "/";
	url.search = "";
	url.hash = "";

	return url.toString();
};

export const createNoindexFollowMeta = () => ({ name: "robots", content: "noindex, follow" });

const serializeJsonLdForScript = (data: JsonLd) =>
	JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (character) => {
		switch (character) {
			case "<":
				return "\\u003C";
			case ">":
				return "\\u003E";
			case "&":
				return "\\u0026";
			case "\u2028":
				return "\\u2028";
			case "\u2029":
				return "\\u2029";
			default:
				return character;
		}
	});

const createStructuredDataScript = (id: string, data: JsonLd) => ({
	id,
	type: "application/ld+json",
	children: serializeJsonLdForScript(data),
});

export const getRootStructuredData = (canonicalUrl: string): JsonLd[] => [
	{
		"@type": "WebSite",
		name: appName,
		url: canonicalUrl,
	},
	{
		"@type": ["SoftwareApplication", "WebApplication"],
		name: appName,
		url: canonicalUrl,
		description:
			"Reactive Resume is a free and open-source resume builder that simplifies the process of creating, updating, and sharing your resume.",
		applicationCategory: "BusinessApplication",
		operatingSystem: "Web",
		isAccessibleForFree: true,
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
		},
		codeRepository: repositoryUrl,
	},
	{
		"@type": "Project",
		name: appName,
		url: canonicalUrl,
		sameAs: [repositoryUrl],
	},
	{
		"@type": "FAQPage",
		mainEntity: homeFaqJsonLdItems.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: item.answer,
			},
		})),
	},
];

export const createRootStructuredDataScript = (canonicalUrl: string) =>
	createStructuredDataScript("reactive-resume-structured-data", {
		"@context": "https://schema.org",
		"@graph": getRootStructuredData(canonicalUrl),
	});

const homeFaqJsonLdItems = [
	{
		question: "Is Reactive Resume really free?",
		answer:
			"Yes! Reactive Resume is completely free to use, with no hidden costs, premium tiers, or subscription fees. It's open-source and will always remain free.",
	},
	{
		question: "How is my data protected?",
		answer:
			"Your data is stored securely and is never shared with third parties. You can also self-host Reactive Resume on your own servers for complete control over your data.",
	},
	{
		question: "Can I export my resume to PDF?",
		answer:
			"Absolutely! You can export your resume to PDF with a single click. The exported PDF maintains all your formatting and styling perfectly.",
	},
	{
		question: "Is Reactive Resume available in multiple languages?",
		answer:
			"Yes, Reactive Resume is available in multiple languages. You can choose your preferred language in the settings page, or using the language switcher in the top right corner. If you don't see your language, or you would like to improve the existing translations, you can contribute to the translations on Crowdin.",
	},
	{
		question: "What makes Reactive Resume different from other resume builders?",
		answer:
			"Reactive Resume is open-source, privacy-focused, and completely free. Unlike other resume builders, it doesn't show ads, track your data, or limit your features behind a paywall.",
	},
	{
		question: "How do I share my resume?",
		answer:
			"You can share your resume via a unique public URL, protect it with a password, or download it as a PDF to share directly. The choice is yours!",
	},
] as const;
