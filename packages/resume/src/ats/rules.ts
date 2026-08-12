import type { CustomSectionType, ResumeData } from "@reactive-resume/schema/resume/data";
import type { AtsRuleCode } from "./catalog";
import type { AtsFinding, AtsFindingParams } from "./types";
import type { WalkedSection } from "./walk";
import { atsRuleSeverity } from "./catalog";
import { isFutureEndpoint, isReversedPeriod, parsePeriod, parseSingleDate } from "./period";
import { isRenderedSection } from "./walk";

export type RuleContext = {
	data: ResumeData;
	sections: readonly WalkedSection[];
	locale: string;
	now: Date;
};

export type AtsRule = (context: RuleContext) => AtsFinding[];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ALLOWED_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

const PERIOD_REQUIRED_TYPES = new Set<CustomSectionType>(["experience", "education"]);

const PROSE_SECTION_TYPES = new Set<CustomSectionType>(["summary", "experience", "education", "projects", "volunteer"]);

const SECTION_TITLE_ALIASES: Partial<Record<CustomSectionType, ReadonlySet<string>>> = {
	summary: new Set([
		"summary",
		"professional summary",
		"profile",
		"about",
		"about me",
		"objective",
		"career objective",
	]),
	experience: new Set([
		"experience",
		"work experience",
		"professional experience",
		"employment",
		"employment history",
		"work history",
		"career history",
	]),
	education: new Set(["education", "academic background", "education & training", "educational background"]),
	projects: new Set(["projects", "personal projects", "selected projects", "side projects"]),
	skills: new Set(["skills", "technical skills", "core competencies", "competencies", "skills & expertise"]),
	languages: new Set(["languages"]),
	interests: new Set(["interests", "hobbies", "hobbies & interests"]),
	awards: new Set(["awards", "honors", "awards & honors", "achievements"]),
	certifications: new Set(["certifications", "certificates", "licenses", "licenses & certifications"]),
	publications: new Set(["publications", "papers", "research"]),
	volunteer: new Set(["volunteer", "volunteering", "volunteer experience", "community involvement"]),
	references: new Set(["references"]),
	profiles: new Set(["profiles", "links", "social profiles"]),
};

const MIN_BODY_FONT_SIZE = 9;
const MIN_LINE_HEIGHT = 1.15;
const MIN_PAGE_MARGIN = 8;

function finding(code: AtsRuleCode, pointer: string, params?: AtsFindingParams): AtsFinding {
	return { code, severity: atsRuleSeverity(code), pointer, ...(params ? { params } : {}) };
}

const isCoverLetter = (section: WalkedSection) => section.type === "cover-letter";

const hasText = (value: unknown) =>
	typeof value === "string" &&
	value
		.replace(/<[^>]*>/g, "")
		.replace(/&nbsp;/g, " ")
		.trim().length > 0;

function isParseableUrl(value: string): boolean {
	try {
		return ALLOWED_URL_PROTOCOLS.has(new URL(value).protocol);
	} catch {
		return false;
	}
}

const contactRules: AtsRule = (context) => {
	const { basics, picture } = context.data;
	const findings: AtsFinding[] = [];

	if (!basics.name.trim()) findings.push(finding("MISSING_NAME", "/basics/name"));

	const email = basics.email.trim();
	if (email) {
		if (!EMAIL_PATTERN.test(email)) findings.push(finding("MALFORMED_EMAIL", "/basics/email", { value: email }));
	} else {
		findings.push(finding("MISSING_EMAIL", "/basics/email"));
	}

	if (!basics.phone.trim()) findings.push(finding("MISSING_PHONE", "/basics/phone"));
	if (!basics.location.trim()) findings.push(finding("MISSING_LOCATION", "/basics/location"));
	if (!picture.hidden && picture.url.trim()) findings.push(finding("PICTURE_PRESENT", "/picture"));

	return findings;
};

const urlRules: AtsRule = (context) => {
	const findings: AtsFinding[] = [];

	const website = context.data.basics.website.url.trim();
	if (website && !isParseableUrl(website)) {
		findings.push(finding("MALFORMED_URL", "/basics/website/url", { value: website }));
	}

	context.data.basics.customFields.forEach((field, index) => {
		const link = field.link.trim();
		if (link && !isParseableUrl(link)) {
			findings.push(finding("MALFORMED_URL", `/basics/customFields/${index}/link`, { value: link }));
		}
	});

	for (const section of context.sections) {
		if (isCoverLetter(section) || !isRenderedSection(section)) continue;

		for (const item of section.items) {
			const itemWebsite = item.value.website as { url?: unknown } | undefined;
			const url = typeof itemWebsite?.url === "string" ? itemWebsite.url.trim() : "";
			if (url && !isParseableUrl(url)) {
				findings.push(finding("MALFORMED_URL", `${item.pointer}/website/url`, { value: url }));
			}
		}
	}

	return findings;
};

function periodFindings(raw: unknown, pointer: string, type: CustomSectionType, context: RuleContext): AtsFinding[] {
	if (typeof raw !== "string") return [];

	const value = raw.trim();
	if (!value) return PERIOD_REQUIRED_TYPES.has(type) ? [finding("EMPTY_PERIOD", pointer)] : [];

	const parsed = parsePeriod(value, context.locale);
	if (!parsed) return [finding("UNPARSEABLE_PERIOD", pointer, { value })];

	const findings: AtsFinding[] = [];
	if (parsed.start && parsed.end && isReversedPeriod(parsed.start, parsed.end)) {
		findings.push(finding("REVERSED_PERIOD", pointer, { value }));
	}
	if (parsed.start && isFutureEndpoint(parsed.start, context.now)) {
		findings.push(finding("FUTURE_DATED_PERIOD", pointer, { value }));
	}

	return findings;
}

function singleDateFindings(raw: unknown, pointer: string, context: RuleContext): AtsFinding[] {
	if (typeof raw !== "string") return [];

	const value = raw.trim();
	if (!value) return [];

	return parseSingleDate(value, context.locale) ? [] : [finding("UNPARSEABLE_DATE", pointer, { value })];
}

const dateRules: AtsRule = (context) => {
	const findings: AtsFinding[] = [];

	for (const section of context.sections) {
		if (isCoverLetter(section) || !isRenderedSection(section)) continue;

		for (const item of section.items) {
			findings.push(...periodFindings(item.value.period, `${item.pointer}/period`, section.type, context));
			findings.push(...singleDateFindings(item.value.date, `${item.pointer}/date`, context));

			const roles = item.value.roles;
			if (!Array.isArray(roles)) continue;

			roles.forEach((role, index) => {
				const value = (role as Record<string, unknown>).period;
				findings.push(...periodFindings(value, `${item.pointer}/roles/${index}/period`, section.type, context));
			});
		}
	}

	return findings;
};

const structureRules: AtsRule = (context) => {
	const findings: AtsFinding[] = [];

	for (const section of context.sections) {
		if (isCoverLetter(section) || section.hidden) continue;

		if (section.placement === "none") {
			if (section.items.length > 0) {
				findings.push(finding("SECTION_MISSING_FROM_LAYOUT", section.pointer, { section: section.id }));
			}
			continue;
		}

		if (section.items.length === 0) {
			findings.push(finding("EMPTY_RENDERED_SECTION", section.pointer, { section: section.id }));
		}
	}

	const experienceSections = context.sections.filter(
		(section) => section.type === "experience" && isRenderedSection(section),
	);

	if (!experienceSections.some((section) => section.items.length > 0)) {
		findings.push(finding("NO_VISIBLE_EXPERIENCE", "/sections/experience"));
	}

	for (const section of experienceSections) {
		for (const item of section.items) {
			const roles = item.value.roles;
			const roleHasText =
				Array.isArray(roles) && roles.some((role) => hasText((role as Record<string, unknown>).description));

			if (!hasText(item.value.description) && !roleHasText) {
				findings.push(finding("MISSING_EXPERIENCE_DESCRIPTION", `${item.pointer}/description`));
			}
		}
	}

	return findings;
};

const titleRules: AtsRule = (context) => {
	if (!context.locale.toLowerCase().startsWith("en")) return [];

	const findings: AtsFinding[] = [];

	for (const section of context.sections) {
		if (isCoverLetter(section) || !isRenderedSection(section)) continue;

		const title = section.title.trim();
		if (!title) continue;

		const aliases = SECTION_TITLE_ALIASES[section.type];
		if (!aliases || aliases.has(title.toLowerCase())) continue;

		findings.push(finding("NON_STANDARD_SECTION_TITLE", `${section.pointer}/title`, { section: section.id, title }));
	}

	return findings;
};

const layoutRules: AtsRule = (context) => {
	const findings: AtsFinding[] = [];

	for (const section of context.sections) {
		if (isCoverLetter(section) || !isRenderedSection(section)) continue;
		if (!PROSE_SECTION_TYPES.has(section.type) || section.items.length === 0) continue;

		if (section.columns > 1) {
			findings.push(
				finding("MULTI_COLUMN_PROSE_SECTION", `${section.pointer}/columns`, {
					section: section.id,
					columns: section.columns,
				}),
			);
		}

		if (section.placement === "sidebar") {
			findings.push(finding("PROSE_SECTION_IN_SIDEBAR", section.pointer, { section: section.id }));
		}
	}

	return findings;
};

const typographyRules: AtsRule = (context) => {
	const findings: AtsFinding[] = [];
	const { page, typography } = context.data.metadata;

	if (typography.body.fontSize < MIN_BODY_FONT_SIZE) {
		findings.push(
			finding("SMALL_BODY_FONT", "/metadata/typography/body/fontSize", {
				fontSize: typography.body.fontSize,
				minimum: MIN_BODY_FONT_SIZE,
			}),
		);
	}

	if (typography.body.lineHeight < MIN_LINE_HEIGHT) {
		findings.push(
			finding("TIGHT_LINE_HEIGHT", "/metadata/typography/body/lineHeight", {
				lineHeight: typography.body.lineHeight,
				minimum: MIN_LINE_HEIGHT,
			}),
		);
	}

	for (const axis of ["marginX", "marginY"] as const) {
		if (page[axis] < MIN_PAGE_MARGIN) {
			findings.push(
				finding("TIGHT_PAGE_MARGINS", `/metadata/page/${axis}`, { margin: page[axis], minimum: MIN_PAGE_MARGIN }),
			);
		}
	}

	return findings;
};

export const ATS_RULES: readonly AtsRule[] = [
	contactRules,
	urlRules,
	dateRules,
	structureRules,
	titleRules,
	layoutRules,
	typographyRules,
];
