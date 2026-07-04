import type {
	AwardItem,
	CertificationItem,
	CoverLetterItem,
	CustomSectionItem,
	CustomSectionType,
	EducationItem,
	ExperienceItem,
	InterestItem,
	LanguageItem,
	ProfileItem,
	ProjectItem,
	PublicationItem,
	ReferenceItem,
	ResumeData,
	SectionType,
	SkillItem,
	SummaryItem,
	VolunteerItem,
} from "@reactive-resume/schema/resume/data";
import type { ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { stripHtml } from "@reactive-resume/utils/string";
import { useResumeData } from "@/features/resume/builder/draft";
import { getSectionTitle } from "@/libs/resume/section";

// Fixed reading order for built-in sections. The visual PDF column order can differ,
// but for a screen-reader mirror a stable, complete order matters more than column fidelity.
const SECTION_ORDER: SectionType[] = [
	"profiles",
	"experience",
	"education",
	"projects",
	"skills",
	"languages",
	"interests",
	"awards",
	"certifications",
	"publications",
	"volunteer",
	"references",
];

const joinInline = (...parts: (string | undefined | null | false)[]): string =>
	parts.filter((part): part is string => typeof part === "string" && part.trim().length > 0).join(" · ");

type ItemWebsite = { url?: string; label?: string };

type ItemBodyProps = {
	primary?: string;
	details?: string;
	description?: string;
	website?: ItemWebsite;
};

function ItemBody({ primary, details, description, website }: ItemBodyProps) {
	const header = joinInline(primary, details);
	const websiteUrl = website?.url?.trim();

	return (
		<>
			{header ? <p>{header}</p> : null}
			{description ? <p>{description}</p> : null}
			{websiteUrl ? <a href={websiteUrl}>{website?.label?.trim() || websiteUrl}</a> : null}
		</>
	);
}

function renderItem(type: CustomSectionType, item: CustomSectionItem): ReactNode {
	switch (type) {
		case "experience": {
			const it = item as ExperienceItem;
			const roles = it.roles ?? [];

			return (
				<>
					<ItemBody
						primary={joinInline(it.position, it.company)}
						details={joinInline(it.location, it.period)}
						description={stripHtml(it.description)}
						website={it.website}
					/>
					{roles.length > 0 ? (
						<ul>
							{roles.map((role) => (
								<li key={role.id}>
									<ItemBody
										primary={joinInline(role.position, role.period)}
										description={stripHtml(role.description)}
									/>
								</li>
							))}
						</ul>
					) : null}
				</>
			);
		}
		case "education": {
			const it = item as EducationItem;

			return (
				<ItemBody
					primary={it.school}
					details={joinInline(it.degree, it.area, it.grade, it.location, it.period)}
					description={stripHtml(it.description)}
					website={it.website}
				/>
			);
		}
		case "skills": {
			const it = item as SkillItem;

			return <ItemBody primary={it.name} details={joinInline(it.proficiency, (it.keywords ?? []).join(", "))} />;
		}
		case "interests": {
			const it = item as InterestItem;

			return <ItemBody primary={it.name} details={(it.keywords ?? []).join(", ")} />;
		}
		case "languages": {
			const it = item as LanguageItem;

			return <ItemBody primary={it.language} details={it.fluency} />;
		}
		case "profiles": {
			const it = item as ProfileItem;

			return <ItemBody primary={joinInline(it.network, it.username)} website={it.website} />;
		}
		case "projects": {
			const it = item as ProjectItem;

			return (
				<ItemBody primary={it.name} details={it.period} description={stripHtml(it.description)} website={it.website} />
			);
		}
		case "awards": {
			const it = item as AwardItem;

			return (
				<ItemBody
					primary={it.title}
					details={joinInline(it.awarder, it.date)}
					description={stripHtml(it.description)}
					website={it.website}
				/>
			);
		}
		case "certifications": {
			const it = item as CertificationItem;

			return (
				<ItemBody
					primary={it.title}
					details={joinInline(it.issuer, it.date)}
					description={stripHtml(it.description)}
					website={it.website}
				/>
			);
		}
		case "publications": {
			const it = item as PublicationItem;

			return (
				<ItemBody
					primary={it.title}
					details={joinInline(it.publisher, it.date)}
					description={stripHtml(it.description)}
					website={it.website}
				/>
			);
		}
		case "volunteer": {
			const it = item as VolunteerItem;

			return (
				<ItemBody
					primary={it.organization}
					details={joinInline(it.location, it.period)}
					description={stripHtml(it.description)}
					website={it.website}
				/>
			);
		}
		case "references": {
			const it = item as ReferenceItem;

			return (
				<ItemBody
					primary={it.name}
					details={joinInline(it.position, it.phone)}
					description={stripHtml(it.description)}
					website={it.website}
				/>
			);
		}
		case "cover-letter": {
			const it = item as CoverLetterItem;

			return <ItemBody description={joinInline(stripHtml(it.recipient), stripHtml(it.content))} />;
		}
		case "summary": {
			const it = item as SummaryItem;

			return <ItemBody description={stripHtml(it.content)} />;
		}
		default:
			return null;
	}
}

type AccessibleSectionProps = {
	type: CustomSectionType;
	title: string;
	hidden: boolean;
	items: CustomSectionItem[];
};

function AccessibleSection({ type, title, hidden, items }: AccessibleSectionProps) {
	if (hidden) return null;

	const visibleItems = items.filter((item) => !item.hidden);
	if (visibleItems.length === 0) return null;

	return (
		<section>
			<h2>{title}</h2>
			<ul>
				{visibleItems.map((item) => (
					<li key={item.id}>{renderItem(type, item)}</li>
				))}
			</ul>
		</section>
	);
}

type ResumeAccessibleTextProps = {
	data?: ResumeData;
};

/**
 * Visually-hidden, screen-reader-readable mirror of the resume content. The builder preview
 * renders the resume as a rasterized PDF canvas that is opaque to assistive tech, so this
 * structured HTML mirror is the permanent accessibility surface for the live editor.
 *
 * DOM-only: the PDF/export pipeline generates its own document and never reads this markup.
 */
export function ResumeAccessibleText({ data }: ResumeAccessibleTextProps) {
	const builderResumeData = useResumeData();
	const resumeData = data ?? builderResumeData;

	if (!resumeData) return null;

	const { basics, summary, sections, customSections } = resumeData;
	const summaryText = summary && !summary.hidden ? stripHtml(summary.content) : "";
	const website = basics.website;

	const contact: ReactNode[] = [];
	if (basics.email) contact.push(<a href={`mailto:${basics.email}`}>{basics.email}</a>);
	if (basics.phone) contact.push(<a href={`tel:${basics.phone}`}>{basics.phone}</a>);
	if (basics.location) contact.push(basics.location);
	if (website?.url?.trim()) contact.push(<a href={website.url}>{website.label?.trim() || website.url}</a>);
	for (const field of basics.customFields ?? []) {
		if (!field.text?.trim()) continue;
		contact.push(field.link?.trim() ? <a href={field.link}>{field.text}</a> : field.text);
	}

	return (
		<section className="sr-only" aria-label={t`Resume content`}>
			<header>
				{basics.name ? <h1>{basics.name}</h1> : null}
				{basics.headline ? <p>{basics.headline}</p> : null}
				{contact.length > 0 ? (
					<ul>
						{contact.map((entry, index) => (
							<li key={index}>{entry}</li>
						))}
					</ul>
				) : null}
			</header>

			{summaryText ? (
				<section>
					<h2>{summary.title?.trim() || getSectionTitle("summary")}</h2>
					<p>{summaryText}</p>
				</section>
			) : null}

			{SECTION_ORDER.map((type) => {
				const section = sections[type];
				if (!section) return null;

				return (
					<AccessibleSection
						key={type}
						type={type}
						title={section.title?.trim() || getSectionTitle(type)}
						hidden={section.hidden}
						items={section.items}
					/>
				);
			})}

			{(customSections ?? []).map((section) => (
				<AccessibleSection
					key={section.id}
					type={section.type}
					title={section.title?.trim() || getSectionTitle(section.type)}
					hidden={section.hidden}
					items={section.items}
				/>
			))}
		</section>
	);
}
