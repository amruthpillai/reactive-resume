import type { Icon } from "@phosphor-icons/react";
import type { SectionType } from "@reactive-resume/schema/resume/data";
import type { CSSProperties, ReactNode } from "react";
import type { WysiwygTheme } from "./theme";
import {
	ArticleIcon,
	BooksIcon,
	BriefcaseIcon,
	CertificateIcon,
	CodeIcon,
	EnvelopeSimpleIcon,
	GlobeIcon,
	GraduationCapIcon,
	HandHeartIcon,
	HeartIcon,
	LinkIcon,
	MapPinIcon,
	PhoneIcon,
	ShareNetworkIcon,
	TranslateIcon,
	TrophyIcon,
	WrenchIcon,
} from "@phosphor-icons/react";
import { useTemplateIconSlot, useTemplateStyle } from "@reactive-resume/pdf/template-styles";
import { headingTextCss, pdfStyleToCss } from "./pdf-style";
import { demoResumeData, withFontFallback } from "./theme";

// ─── Section metadata (icon + default English title) ─────────────────────────

const SECTION_META: Record<SectionType | "summary", { title: string; icon: Icon }> = {
	summary: { title: "Summary", icon: ArticleIcon },
	profiles: { title: "Profiles", icon: ShareNetworkIcon },
	experience: { title: "Experience", icon: BriefcaseIcon },
	education: { title: "Education", icon: GraduationCapIcon },
	projects: { title: "Projects", icon: CodeIcon },
	skills: { title: "Skills", icon: WrenchIcon },
	languages: { title: "Languages", icon: TranslateIcon },
	interests: { title: "Interests", icon: HeartIcon },
	awards: { title: "Awards", icon: TrophyIcon },
	certifications: { title: "Certifications", icon: CertificateIcon },
	publications: { title: "Publications", icon: BooksIcon },
	volunteer: { title: "Volunteering", icon: HandHeartIcon },
	references: { title: "References", icon: PhoneIcon },
};

const visible = <T extends { hidden: boolean }>(items: T[]): T[] => items.filter((item) => !item.hidden);

// Mirrors defaultSectionHeadingContainerStyle in packages/pdf/.../shared/sections.tsx
const DEFAULT_HEADING_CONTAINER = { flexDirection: "row", alignItems: "flex-start", columnGap: 4 };

// ─── Section block (mirrors SectionShell with the base template's slots) ─────

function SectionBlock({ sectionType, theme }: { sectionType: SectionType | "summary"; theme: WysiwygTheme }) {
	const meta = SECTION_META[sectionType];
	const HeadingIcon = meta.icon;

	const sectionStyle = useTemplateStyle("section");
	const sectionHeadingStyle = useTemplateStyle("sectionHeading");
	const sectionHeadingContainerStyle = useTemplateStyle("sectionHeadingContainer");
	const sectionItemsStyle = useTemplateStyle("sectionItems");
	const headingStyle = useTemplateStyle("heading");
	const iconSlot = useTemplateIconSlot("sectionHeadingIcon");

	const sectionCss = pdfStyleToCss(sectionStyle, { asFlexContainer: true });
	const headingContainerCss = pdfStyleToCss(
		[sectionHeadingStyle, DEFAULT_HEADING_CONTAINER, sectionHeadingContainerStyle],
		{
			asFlexContainer: true,
		},
	);
	const headingTextStyle: CSSProperties = {
		...pdfStyleToCss(headingStyle),
		...headingTextCss(sectionHeadingStyle),
		fontFamily: withFontFallback(theme.headingFontFamily),
	};
	const itemsCss = pdfStyleToCss(sectionItemsStyle, { asFlexContainer: true });

	const iconColor =
		(iconSlot.color as string | undefined) ?? (headingTextStyle.color as string | undefined) ?? theme.primary;
	const headingSize = Number(headingTextStyle.fontSize) || theme.headingFontSize;

	return (
		<div style={sectionCss}>
			<div style={headingContainerCss}>
				<HeadingIcon size={headingSize} color={iconColor} weight="bold" style={{ flexShrink: 0 }} />
				<span style={headingTextStyle}>{meta.title}</span>
			</div>
			<div style={itemsCss}>
				<SectionBody sectionType={sectionType} theme={theme} />
			</div>
		</div>
	);
}

// ─── Item building blocks ─────────────────────────────────────────────────────

type ItemHeaderProps = {
	title: string;
	subtitle?: string;
	trailingTop?: string;
	trailingBottom?: string;
};

// Two rows, each with a left field and an optional right-aligned trailing field —
// the common built-in item-header shape (e.g. company / location, then position
// / period).
function ItemHeader({ title, subtitle, trailingTop, trailingBottom }: ItemHeaderProps) {
	const splitRow: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" };
	return (
		<div style={{ marginBottom: 1 }}>
			<div style={splitRow}>
				<span style={{ fontWeight: 600 }}>{title}</span>
				{trailingTop ? <span style={{ opacity: 0.85, flexShrink: 0 }}>{trailingTop}</span> : null}
			</div>
			{subtitle || trailingBottom ? (
				<div style={splitRow}>
					<span style={{ opacity: 0.85 }}>{subtitle}</span>
					{trailingBottom ? (
						<span style={{ opacity: 0.7, flexShrink: 0, fontSize: "0.9em" }}>{trailingBottom}</span>
					) : null}
				</div>
			) : null}
		</div>
	);
}

const joinDot = (...parts: (string | undefined)[]): string => parts.filter(Boolean).join(" • ");

function RichHtml({ html }: { html: string }) {
	if (!html) return null;
	return (
		<div
			// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted demo fixture content
			dangerouslySetInnerHTML={{ __html: html }}
			className="[&_a]:underline [&_li]:mb-px [&_p]:m-0 [&_ul]:list-disc [&_ul]:ps-4"
			style={{ marginTop: 1 }}
		/>
	);
}

function Tags({ keywords }: { keywords: string[] }) {
	if (keywords.length === 0) return null;
	return (
		<div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 2 }}>
			{keywords.map((kw) => (
				<span
					key={kw}
					style={{
						borderRadius: 3,
						padding: "0 4px",
						fontSize: "0.85em",
						opacity: 0.75,
						border: "1px solid currentColor",
					}}
				>
					{kw}
				</span>
			))}
		</div>
	);
}

function Level({ level, theme }: { level: number; theme: WysiwygTheme }) {
	if (level <= 0) return null;
	return (
		<div style={{ display: "flex", gap: 2, marginTop: 2 }}>
			{Array.from({ length: 5 }, (_, i) => (
				<span
					key={i}
					style={{
						width: 6,
						height: 6,
						borderRadius: "50%",
						backgroundColor: i < level ? theme.primary : "transparent",
						border: `1px solid ${theme.primary}`,
					}}
				/>
			))}
		</div>
	);
}

const ItemList = ({ children }: { children: ReactNode }) => (
	<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
);

// ─── Section bodies ───────────────────────────────────────────────────────────

function SectionBody({ sectionType, theme }: { sectionType: SectionType | "summary"; theme: WysiwygTheme }) {
	const { sections, summary } = demoResumeData;

	switch (sectionType) {
		case "summary":
			return <RichHtml html={summary.content} />;

		case "profiles":
			return (
				<ItemList>
					{visible(sections.profiles.items).map((item) => (
						<ItemHeader key={item.id} title={item.network} subtitle={item.username} />
					))}
				</ItemList>
			);

		case "experience":
			return (
				<ItemList>
					{visible(sections.experience.items).map((item) => (
						<div key={item.id}>
							<ItemHeader
								title={item.company}
								subtitle={item.position}
								trailingTop={item.location}
								trailingBottom={item.period}
							/>
							<RichHtml html={item.description} />
						</div>
					))}
				</ItemList>
			);

		case "education":
			return (
				<ItemList>
					{visible(sections.education.items).map((item) => (
						<div key={item.id}>
							<ItemHeader
								title={item.school}
								subtitle={`${item.degree}, ${item.area}`}
								trailingTop={item.grade}
								trailingBottom={joinDot(item.location, item.period)}
							/>
							<RichHtml html={item.description} />
						</div>
					))}
				</ItemList>
			);

		case "projects":
			return (
				<ItemList>
					{visible(sections.projects.items).map((item) => (
						<div key={item.id}>
							<ItemHeader title={item.name} trailingBottom={item.period} />
							<RichHtml html={item.description} />
						</div>
					))}
				</ItemList>
			);

		case "skills":
			return (
				<ItemList>
					{visible(sections.skills.items).map((item) => (
						<div key={item.id}>
							<ItemHeader title={item.name} subtitle={item.proficiency} />
							<Level level={item.level} theme={theme} />
							<Tags keywords={item.keywords} />
						</div>
					))}
				</ItemList>
			);

		case "languages":
			return (
				<ItemList>
					{visible(sections.languages.items).map((item) => (
						<div key={item.id}>
							<ItemHeader title={item.language} subtitle={item.fluency} />
							<Level level={item.level} theme={theme} />
						</div>
					))}
				</ItemList>
			);

		case "interests":
			return (
				<ItemList>
					{visible(sections.interests.items).map((item) => (
						<div key={item.id}>
							<span style={{ fontWeight: 600 }}>{item.name}</span>
							<Tags keywords={item.keywords} />
						</div>
					))}
				</ItemList>
			);

		case "awards":
			return (
				<ItemList>
					{visible(sections.awards.items).map((item) => (
						<div key={item.id}>
							<ItemHeader title={item.title} subtitle={item.awarder} trailingTop={item.date} />
							<RichHtml html={item.description} />
						</div>
					))}
				</ItemList>
			);

		case "certifications":
			return (
				<ItemList>
					{visible(sections.certifications.items).map((item) => (
						<ItemHeader key={item.id} title={item.title} subtitle={item.issuer} trailingTop={item.date} />
					))}
				</ItemList>
			);

		case "publications":
			return (
				<ItemList>
					{visible(sections.publications.items).map((item) => (
						<div key={item.id}>
							<ItemHeader title={item.title} subtitle={item.publisher} trailingTop={item.date} />
							<RichHtml html={item.description} />
						</div>
					))}
				</ItemList>
			);

		case "volunteer":
			return (
				<ItemList>
					{visible(sections.volunteer.items).map((item) => (
						<div key={item.id}>
							<ItemHeader title={item.organization} trailingTop={item.location} trailingBottom={item.period} />
							<RichHtml html={item.description} />
						</div>
					))}
				</ItemList>
			);

		case "references":
			return (
				<ItemList>
					{visible(sections.references.items).map((item) => (
						<ItemHeader key={item.id} title={item.name} subtitle={item.position} />
					))}
				</ItemList>
			);

		default:
			return null;
	}
}

// ─── Header placeholders (use the base template's heading/text slots) ────────

function DemoName({ theme }: { theme: WysiwygTheme }) {
	const headingCss = pdfStyleToCss(useTemplateStyle("heading"));
	return (
		<span
			style={{
				...headingCss,
				fontFamily: withFontFallback(theme.headingFontFamily),
				fontSize: theme.headingFontSize * 1.5,
				fontWeight: 700,
				lineHeight: 1.1,
			}}
		>
			{demoResumeData.basics.name}
		</span>
	);
}

function DemoHeadline() {
	return <span>{demoResumeData.basics.headline}</span>;
}

function ContactItem({ icon: ContactIcon, label, theme }: { icon: Icon; label: string; theme: WysiwygTheme }) {
	return (
		<span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
			<ContactIcon size={theme.bodyFontSize} style={{ color: theme.primary, flexShrink: 0 }} />
			{label}
		</span>
	);
}

function DemoContact({ theme }: { theme: WysiwygTheme }) {
	const { basics } = demoResumeData;
	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				rowGap: 2,
				columnGap: 8,
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{basics.email ? <ContactItem icon={EnvelopeSimpleIcon} label={basics.email} theme={theme} /> : null}
			{basics.phone ? <ContactItem icon={PhoneIcon} label={basics.phone} theme={theme} /> : null}
			{basics.location ? <ContactItem icon={MapPinIcon} label={basics.location} theme={theme} /> : null}
			{basics.website.url ? (
				<ContactItem icon={GlobeIcon} label={basics.website.label || basics.website.url} theme={theme} />
			) : null}
			{basics.customFields.map((field) => (
				<ContactItem key={field.id} icon={LinkIcon} label={field.text} theme={theme} />
			))}
		</div>
	);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

type DemoPlaceholderProps = {
	type: string;
	theme: WysiwygTheme;
	pictureSize?: number;
	pictureBorderRadius?: number;
};

export function DemoPlaceholder({ type, theme, pictureSize, pictureBorderRadius }: DemoPlaceholderProps) {
	const { picture } = demoResumeData;

	if (type === "placeholder.name") return <DemoName theme={theme} />;
	if (type === "placeholder.headline") return <DemoHeadline />;
	if (type === "placeholder.contact") return <DemoContact theme={theme} />;

	if (type === "placeholder.picture") {
		const size = pictureSize ?? 80;
		const radiusPct = pictureBorderRadius ?? 0;
		// Match PicturePlaceholder in CustomTemplatePage: radius is a px value
		// derived from the percentage, not a CSS `%` (which would always be a circle).
		const radius = (size * radiusPct) / 100 / 2;
		return (
			<img
				src={picture.url}
				alt=""
				style={{ width: size, height: size, objectFit: "cover", borderRadius: radius, display: "block" }}
			/>
		);
	}

	if (type.startsWith("placeholder.")) {
		const sectionType = type.replace("placeholder.", "") as SectionType | "summary";
		if (!(sectionType in SECTION_META)) return null;
		return <SectionBlock sectionType={sectionType} theme={theme} />;
	}

	return null;
}
