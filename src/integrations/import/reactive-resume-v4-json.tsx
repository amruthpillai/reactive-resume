/** biome-ignore-all lint/style/noNonNullAssertion: only used in places where we know the value is not null */

import z, { flattenError, ZodError } from "zod";
import { type ResumeData, resumeDataSchema } from "@/schema/resume/data";
import { type Template, templateSchema } from "@/schema/templates";
import { parseRgbString } from "@/utils/color";
import { generateId } from "@/utils/string";

function colorToRgba(color: string): string {
	const parsed = parseRgbString(color);
	if (!parsed) return "rgba(0, 0, 0, 1)";
	return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${parsed.a})`;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const nonNegative = (value: number): number => Math.max(0, value);

const pxToPt = (px: number): number => px * 0.75;

const clampPictureSize = (size: number): number => clamp(size, 32, 512);

const clampRotation = (rotation: number): number => clamp(rotation, 0, 360);

const clampAspectRatio = (ratio: number): number => clamp(ratio, 0.5, 2.5);

const clampBorderRadius = (radius: number): number => clamp(radius, 0, 100);

const clampFontSize = (size: number): number => clamp(size, 6, 24);

const clampLineHeight = (height: number): number => clamp(height, 0.5, 4);

const clampSidebarWidth = (width: number): number => clamp(width, 10, 50);

const clampLevel = (level: number): number => clamp(level, 0, 5);

const convertAndClampFontSize = (px: number): number => clampFontSize(pxToPt(px));

const isValidEmail = (email: string): boolean => {
	if (!email) return false;
	return z.email().safeParse(email).success;
};

const sanitizeEmail = (email: string | undefined): string => {
	if (!email) return "";
	return isValidEmail(email) ? email : "";
};

type FontWeight = "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";

const FONT_WEIGHT_MAP: Record<string, FontWeight> = {
	regular: "400",
	italic: "400",
	"100": "100",
	"200": "200",
	"300": "300",
	"400": "400",
	"500": "500",
	"600": "600",
	"700": "700",
	"800": "800",
	"900": "900",
	bold: "700",
	"bold-italic": "700",
};

const convertFontVariantToWeight = (variant: string, defaultWeight: FontWeight = "400"): FontWeight =>
	FONT_WEIGHT_MAP[variant.toLowerCase()] ?? defaultWeight;

const convertFontVariants = (variants: string[] | undefined, defaultWeight: FontWeight = "400"): FontWeight[] => {
	if (!variants || variants.length === 0) return [defaultWeight];
	return variants.map((v) => convertFontVariantToWeight(v, defaultWeight));
};

const convertFontVariantsForHeading = (variants: string[] | undefined): FontWeight[] => {
	const weights = convertFontVariants(variants, "600");
	const filtered = weights.filter((w) => Number.parseInt(w, 10) >= 600);
	return filtered.length > 0 ? filtered : ["600"];
};

type V4ResumeData = {
	basics: {
		name: string;
		headline: string;
		email: string;
		phone: string;
		location: string;
		url: {
			label: string;
			href: string;
		};
		customFields: Array<{
			id?: string;
			icon?: string;
			text?: string;
		}>;
		picture: {
			url: string;
			size: number;
			aspectRatio: number;
			borderRadius: number;
			effects: {
				hidden: boolean;
				border: boolean;
				grayscale: boolean;
			};
		};
	};
	sections: {
		summary: {
			name: string;
			columns: number;
			separateLinks: boolean;
			visible: boolean;
			id: string;
			content: string;
		};
		awards: {
			name: string;
			columns: number;
			separateLinks: boolean;
			visible: boolean;
			id: string;
			items: Array<{
				id: string;
				visible: boolean;
				title?: string;
				awarder?: string;
				date?: string;
				summary?: string;
				url?: {
					label: string;
					href: string;
				};
			}>;
		};
		certifications: {
			name: string;
			columns: number;
			separateLinks: boolean;
			visible: boolean;
			id: string;
			items: Array<{
				id: string;
				visible: boolean;
				name?: string;
				issuer?: string;
				date?: string;
				summary?: string;
				url?: {
					label: string;
					href: string;
				};
			}>;
		};
		education: {
			name: string;
			columns: number;
			separateLinks: boolean;
			visible: boolean;
			id: string;
			items: Array<{
				id: string;
				visible: boolean;
				institution?: string;
				studyType?: string;
				area?: string;
				score?: string;
				date?: string;
				summary?: string;
				url?: {
					label: string;
					href: string;
				};
			}>;
		};
		experience: {
			name: string;
			columns: number;
			separateLinks: boolean;
			visible: boolean;
			id: string;
			items: Array<{
				id: string;
				visible: boolean;
				company?: string;
				position?: string;
				location?: string;
				date?: string;
				summary?: string;
				url?: {
					label: string;
					href: string;
				};
			}>;
		};
		volunteer: {
			name: string;
			columns: number;
			separateLinks: boolean;
			visible: boolean;
			id: string;
			items: Array<{
				id: string;
				visible: boolean;
				organization?: string;
				position?: string;
				location?: string;
				date?: string;
				summary?: string;
				url?: {
					label: string;
					href: string;
				};
			}>;
		};
		interests: {
			name: string;
			columns: number;
			separateLinks: boolean;
			visible: boolean;
			id: string;
			items: Array<{
				id: string;
				visible: boolean;
				name?: string;
				keywords?: string[];
			}>;
		};
		languages: {
			name: string;
			columns: number;
			separateLinks: boolean;
			visible: boolean;
			id: string;
			items: Array<{
				id: string;
				visible: boolean;
				language?: string;
				fluency?: string;
				level?: number;
			}>;
		};
		profiles: {
			name: string;
			columns: number;
			separateLinks: boolean;
			visible: boolean;
			id: string;
			items: Array<{
				id: string;
				visible: boolean;
				network?: string;
				username?: string;
				icon?: string;
				url?: {
					label: string;
					href: string;
				};
			}>;
		};
		projects: {
			name: string;
			columns: number;
			separateLinks: boolean;
			visible: boolean;
			id: string;
			items: Array<{
				id: string;
				visible: boolean;
				name?: string;
				description?: string;
				date?: string;
				summary?: string;
				keywords?: string[];
				url?: {
					label: string;
					href: string;
				};
			}>;
		};
		publications: {
			name: string;
			columns: number;
			separateLinks: boolean;
			visible: boolean;
			id: string;
			items: Array<{
				id: string;
				visible: boolean;
				name?: string;
				publisher?: string;
				date?: string;
				summary?: string;
				url?: {
					label: string;
					href: string;
				};
			}>;
		};
		references: {
			name: string;
			columns: number;
			separateLinks: boolean;
			visible: boolean;
			id: string;
			items: Array<{
				id: string;
				visible: boolean;
				name?: string;
				description?: string;
				summary?: string;
				url?: {
					label: string;
					href: string;
				};
			}>;
		};
		skills: {
			name: string;
			columns: number;
			separateLinks: boolean;
			visible: boolean;
			id: string;
			items: Array<{
				id: string;
				visible: boolean;
				name?: string;
				description?: string;
				level?: number;
				keywords?: string[];
			}>;
		};
		custom?: Record<
			string,
			{
				name: string;
				columns: number;
				separateLinks: boolean;
				visible: boolean;
				id: string;
				items: Array<{
					id: string;
					visible: boolean;
					name?: string;
					description?: string;
					date?: string;
					location?: string;
					summary?: string;
					keywords?: string[];
					url?: {
						label: string;
						href: string;
					};
				}>;
			}
		>;
	};
	metadata: {
		template: string;
		layout: Array<Array<string[]>>;
		css: {
			value: string;
			visible: boolean;
		};
		page: {
			margin: number;
			format: "a4" | "letter";
			options: {
				breakLine: boolean;
				pageNumbers: boolean;
			};
		};
		theme: {
			background: string;
			text: string;
			primary: string;
		};
		typography: {
			font: {
				family: string;
				subset: string;
				variants: string[];
				size: number;
			};
			lineHeight: number;
			hideIcons: boolean;
			underlineLinks: boolean;
		};
		notes: string;
	};
};

export class ReactiveResumeV4JSONImporter {
	parse(json: string): ResumeData {
		try {
			const v4Data = JSON.parse(json) as V4ResumeData;

			const transformed: ResumeData = {
				picture: {
					hidden: v4Data.basics.picture?.effects?.hidden ?? false,
					url: v4Data.basics.picture?.url ?? "",
					size: clampPictureSize(v4Data.basics.picture?.size ?? 80),
					rotation: clampRotation(0),
					aspectRatio: clampAspectRatio(v4Data.basics.picture?.aspectRatio ?? 1),
					borderRadius: clampBorderRadius(v4Data.basics.picture?.borderRadius ?? 0),
					borderColor: v4Data.basics.picture?.effects?.border ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0)",
					borderWidth: nonNegative(v4Data.basics.picture?.effects?.border ? 1 : 0),
					shadowColor: "rgba(0, 0, 0, 0.5)",
					shadowWidth: nonNegative(0),
				},
				basics: {
					name: v4Data.basics.name ?? "",
					headline: v4Data.basics.headline ?? "",
					email: sanitizeEmail(v4Data.basics.email),
					phone: v4Data.basics.phone ?? "",
					location: v4Data.basics.location ?? "",
					website: {
						url: v4Data.basics.url?.href ?? "",
						label: v4Data.basics.url?.label ?? "",
					},
					customFields: (v4Data.basics.customFields ?? []).map((field) => ({
						id: field.id ?? generateId(),
						icon: field.icon ?? "",
						text: field.text ?? "",
						link: "",
					})),
				},
				summary: {
					title: v4Data.sections.summary?.name ?? "",
					columns: v4Data.sections.summary?.columns ?? 1,
					hidden: !(v4Data.sections.summary?.visible ?? true),
					content: v4Data.sections.summary?.content ?? "",
				},
				sections: {
					profiles: {
						title: v4Data.sections.profiles?.name ?? "",
						columns: v4Data.sections.profiles?.columns ?? 1,
						hidden: !(v4Data.sections.profiles?.visible ?? true),
						items: (v4Data.sections.profiles?.items ?? [])
							.filter((item) => item.network && item.network.length > 0)
							.map((item) => ({
								id: item.id ?? generateId(),
								hidden: !(item.visible ?? true),
								icon: item.icon ?? "",
								network: item.network!,
								username: item.username ?? "",
								website: {
									url: item.url?.href ?? "",
									label: item.url?.label ?? "",
								},
							})),
					},
					experience: {
						title: v4Data.sections.experience?.name ?? "",
						columns: v4Data.sections.experience?.columns ?? 1,
						hidden: !(v4Data.sections.experience?.visible ?? true),
						items: (v4Data.sections.experience?.items ?? [])
							.filter((item) => item.company && item.company.length > 0)
							.map((item) => ({
								id: item.id ?? generateId(),
								hidden: !(item.visible ?? true),
								company: item.company!,
								position: item.position ?? "",
								location: item.location ?? "",
								period: item.date ?? "",
								website: {
									url: item.url?.href ?? "",
									label: item.url?.label ?? "",
								},
								description: item.summary ?? "",
							})),
					},
					education: {
						title: v4Data.sections.education?.name ?? "",
						columns: v4Data.sections.education?.columns ?? 1,
						hidden: !(v4Data.sections.education?.visible ?? true),
						items: (v4Data.sections.education?.items ?? [])
							.filter((item) => item.institution && item.institution.length > 0)
							.map((item) => ({
								id: item.id ?? generateId(),
								hidden: !(item.visible ?? true),
								school: item.institution!,
								degree: item.studyType ?? "",
								area: item.area ?? "",
								grade: item.score ?? "",
								location: "",
								period: item.date ?? "",
								website: {
									url: item.url?.href ?? "",
									label: item.url?.label ?? "",
								},
								description: item.summary ?? "",
							})),
					},
					projects: {
						title: v4Data.sections.projects?.name ?? "",
						columns: v4Data.sections.projects?.columns ?? 1,
						hidden: !(v4Data.sections.projects?.visible ?? true),
						items: (v4Data.sections.projects?.items ?? [])
							.filter((item) => item.name && item.name.length > 0)
							.map((item) => ({
								id: item.id ?? generateId(),
								hidden: !(item.visible ?? true),
								name: item.name!,
								period: item.date ?? "",
								website: {
									url: item.url?.href ?? "",
									label: item.url?.label ?? "",
								},
								description: item.summary ?? item.description ?? "",
							})),
					},
					skills: {
						title: v4Data.sections.skills?.name ?? "",
						columns: v4Data.sections.skills?.columns ?? 1,
						hidden: !(v4Data.sections.skills?.visible ?? true),
						items: (v4Data.sections.skills?.items ?? [])
							.filter((item) => item.name && item.name.length > 0)
							.map((item) => ({
								id: item.id ?? generateId(),
								hidden: !(item.visible ?? true),
								icon: "",
								name: item.name!,
								proficiency: item.description ?? "",
								level: clampLevel(item.level ?? 0),
								keywords: item.keywords ?? [],
							})),
					},
					languages: {
						title: v4Data.sections.languages?.name ?? "",
						columns: v4Data.sections.languages?.columns ?? 1,
						hidden: !(v4Data.sections.languages?.visible ?? true),
						items: (v4Data.sections.languages?.items ?? [])
							.filter((item) => item.language && item.language.length > 0)
							.map((item) => ({
								id: item.id ?? generateId(),
								hidden: !(item.visible ?? true),
								language: item.language!,
								fluency: item.fluency ?? "",
								level: clampLevel(item.level ?? 0),
							})),
					},
					interests: {
						title: v4Data.sections.interests?.name ?? "",
						columns: v4Data.sections.interests?.columns ?? 1,
						hidden: !(v4Data.sections.interests?.visible ?? true),
						items: (v4Data.sections.interests?.items ?? [])
							.filter((item) => item.name && item.name.length > 0)
							.map((item) => ({
								id: item.id ?? generateId(),
								hidden: !(item.visible ?? true),
								icon: "",
								name: item.name!,
								keywords: item.keywords ?? [],
							})),
					},
					awards: {
						title: v4Data.sections.awards?.name ?? "",
						columns: v4Data.sections.awards?.columns ?? 1,
						hidden: !(v4Data.sections.awards?.visible ?? true),
						items: (v4Data.sections.awards?.items ?? [])
							.filter((item) => item.title && item.title.length > 0)
							.map((item) => ({
								id: item.id ?? generateId(),
								hidden: !(item.visible ?? true),
								title: item.title!,
								awarder: item.awarder ?? "",
								date: item.date ?? "",
								website: {
									url: item.url?.href ?? "",
									label: item.url?.label ?? "",
								},
								description: item.summary ?? "",
							})),
					},
					certifications: {
						title: v4Data.sections.certifications?.name ?? "",
						columns: v4Data.sections.certifications?.columns ?? 1,
						hidden: !(v4Data.sections.certifications?.visible ?? true),
						items: (v4Data.sections.certifications?.items ?? [])
							.filter((item) => item.name && item.name.length > 0)
							.map((item) => ({
								id: item.id ?? generateId(),
								hidden: !(item.visible ?? true),
								title: item.name!,
								issuer: item.issuer ?? "",
								date: item.date ?? "",
								website: {
									url: item.url?.href ?? "",
									label: item.url?.label ?? "",
								},
								description: item.summary ?? "",
							})),
					},
					publications: {
						title: v4Data.sections.publications?.name ?? "",
						columns: v4Data.sections.publications?.columns ?? 1,
						hidden: !(v4Data.sections.publications?.visible ?? true),
						items: (v4Data.sections.publications?.items ?? [])
							.filter((item) => item.name && item.name.length > 0)
							.map((item) => ({
								id: item.id ?? generateId(),
								hidden: !(item.visible ?? true),
								title: item.name!,
								publisher: item.publisher ?? "",
								date: item.date ?? "",
								website: {
									url: item.url?.href ?? "",
									label: item.url?.label ?? "",
								},
								description: item.summary ?? "",
							})),
					},
					volunteer: {
						title: v4Data.sections.volunteer?.name ?? "",
						columns: v4Data.sections.volunteer?.columns ?? 1,
						hidden: !(v4Data.sections.volunteer?.visible ?? true),
						items: (v4Data.sections.volunteer?.items ?? [])
							.filter((item) => item.organization && item.organization.length > 0)
							.map((item) => ({
								id: item.id ?? generateId(),
								hidden: !(item.visible ?? true),
								organization: item.organization!,
								location: item.location ?? "",
								period: item.date ?? "",
								website: {
									url: item.url?.href ?? "",
									label: item.url?.label ?? "",
								},
								description: item.summary ?? "",
							})),
					},
					references: {
						title: v4Data.sections.references?.name ?? "",
						columns: v4Data.sections.references?.columns ?? 1,
						hidden: !(v4Data.sections.references?.visible ?? true),
						items: (v4Data.sections.references?.items ?? [])
							.filter((item) => item.name && item.name.length > 0)
							.map((item) => ({
								id: item.id ?? generateId(),
								hidden: !(item.visible ?? true),
								name: item.name!,
								position: item.description ?? "",
								phone: "",
								website: {
									url: item.url?.href ?? "",
									label: item.url?.label ?? "",
								},
								description: item.summary ?? "",
							})),
					},
				},
				customSections: Object.entries(v4Data.sections.custom ?? {}).map(([sectionId, section]) => ({
					id: section.id || sectionId,
					title: section.name ?? "",
					type: "experience" as const, // Default to experience type as it has the most compatible fields
					columns: section.columns ?? 1,
					hidden: !(section.visible ?? true),
					items: section.items
						.filter((item) => item.visible !== false)
						.map((item, index) => ({
							id: item.id || generateId(),
							hidden: !item.visible,
							company: item.name?.trim() || `#${index + 1}`,
							position: item.description ?? "",
							location: item.location ?? "",
							period: item.date ?? "",
							website: {
								url: item.url?.href ?? "",
								label: item.url?.label ?? "",
							},
							description: item.summary ?? "",
						})),
				})),
				metadata: {
					template: (templateSchema.safeParse(v4Data.metadata.template).success
						? v4Data.metadata.template
						: "onyx") as Template,
					layout: {
						sidebarWidth: clampSidebarWidth(35),
						pages: (v4Data.metadata.layout ?? []).map((page) => {
							const main = page[0] ?? [];
							const sidebar = page[1] ?? [];
							return {
								fullWidth: sidebar.length === 0,
								main: main.filter((id) => id !== "summary"),
								sidebar: sidebar,
							};
						}),
					},
					css: {
						enabled: v4Data.metadata.css?.visible ?? false,
						value: v4Data.metadata.css?.value ?? "",
					},
					page: {
						gapX: nonNegative(4),
						gapY: nonNegative(6),
						marginX: nonNegative(v4Data.metadata.page?.margin ?? 14),
						marginY: nonNegative(v4Data.metadata.page?.margin ?? 14),
						format: v4Data.metadata.page?.format ?? "a4",
						locale: "en-US",
						hideIcons: v4Data.metadata.typography?.hideIcons ?? false,
					},
					design: {
						colors: {
							primary: v4Data.metadata.theme?.primary
								? colorToRgba(v4Data.metadata.theme.primary)
								: "rgba(220, 38, 38, 1)",
							text: v4Data.metadata.theme?.text ? colorToRgba(v4Data.metadata.theme.text) : "rgba(0, 0, 0, 1)",
							background: v4Data.metadata.theme?.background
								? colorToRgba(v4Data.metadata.theme.background)
								: "rgba(255, 255, 255, 1)",
						},
						level: {
							icon: "star",
							type: "circle",
						},
					},
					typography: {
						body: {
							fontFamily: v4Data.metadata.typography?.font?.family ?? "IBM Plex Serif",
							fontWeights: convertFontVariants(v4Data.metadata.typography?.font?.variants),
							fontSize: convertAndClampFontSize(v4Data.metadata.typography?.font?.size ?? 14.67),
							lineHeight: clampLineHeight(v4Data.metadata.typography?.lineHeight ?? 1.5),
						},
						heading: {
							fontFamily: v4Data.metadata.typography?.font?.family ?? "IBM Plex Serif",
							fontWeights: convertFontVariantsForHeading(v4Data.metadata.typography?.font?.variants),
							fontSize: clampFontSize(convertAndClampFontSize(v4Data.metadata.typography?.font?.size ?? 14.67) + 3),
							lineHeight: clampLineHeight(v4Data.metadata.typography?.lineHeight ?? 1.5),
						},
					},
					notes: v4Data.metadata.notes ?? "",
				},
			};

			if (v4Data.sections.summary?.visible && v4Data.sections.summary?.content) {
				if (transformed.metadata.layout.pages.length > 0) {
					transformed.metadata.layout.pages[0].main.unshift("summary");
				}
			}

			return resumeDataSchema.parse(transformed);
		} catch (error: unknown) {
			if (error instanceof ZodError) {
				const errors = flattenError(error);
				throw new Error(JSON.stringify(errors));
			}

			throw error;
		}
	}
}
