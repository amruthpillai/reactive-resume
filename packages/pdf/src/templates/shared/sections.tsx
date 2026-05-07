import type { Style } from "@react-pdf/types";
import type {
	AwardItem,
	CertificationItem,
	CoverLetterItem,
	EducationItem,
	ExperienceItem,
	InterestItem,
	LanguageItem,
	ProfileItem,
	ProjectItem,
	PublicationItem,
	ReferenceItem,
	SkillItem,
	SummaryItem,
	VolunteerItem,
} from "@reactive-resume/schema/resume/data";
import type { IconName } from "phosphor-icons-react-pdf/dynamic";
import type { ReactNode } from "react";
import type { StyleInput, TemplatePlacement } from "./styles";
import type { CustomItemSection, ItemSection } from "./types";
import { View } from "@react-pdf/renderer";
import { Children, createContext, useContext } from "react";
import { match } from "ts-pattern";
import { useRender } from "../../context";
import { getResumeSectionTitle } from "../../section-title";
import { getSectionItemRows, getSectionItemsLayout, shouldUseSectionTimeline } from "./columns";
import {
	TemplatePlacementProvider,
	useTemplateFeature,
	useTemplateFeatureStyle,
	useTemplatePlacement,
	useTemplateStyle,
} from "./context";
import { filterItems, hasVisibleItems, isSectionVisible, isVisibleSummary } from "./filtering";
import { LevelDisplay } from "./level-display";
import { MetaLine } from "./meta-line";
import { getTemplateMetrics } from "./metrics";
import { Bold, Div, Heading, Icon, Link, Small, Text } from "./primitives";
import { RichText } from "./rich-text";
import { composeStyles } from "./styles";

type SectionItemsContextValue = {
	itemStyle: StyleInput;
	useTimeline: boolean;
};

const SectionItemsContext = createContext<SectionItemsContextValue>({ itemStyle: undefined, useTimeline: false });

const useSectionItemsContext = () => useContext(SectionItemsContext);

const getVisibleItems = <T extends { hidden: boolean }>(section: ItemSection<T>): T[] => {
	if (!hasVisibleItems(section)) return [];

	return filterItems(section.items);
};

const SectionShell = ({
	sectionId,
	title,
	showHeading = true,
	children,
}: {
	sectionId: string;
	title: string;
	showHeading?: boolean;
	children: ReactNode;
}) => {
	const data = useRender();
	const sectionStyle = useTemplateStyle("section");
	const sectionHeadingStyle = useTemplateStyle("sectionHeading");
	const sectionTitle = getResumeSectionTitle(data, sectionId, title);

	return (
		<View style={composeStyles(sectionStyle)}>
			{showHeading && <Heading style={composeStyles(sectionHeadingStyle)}>{sectionTitle}</Heading>}
			{children}
		</View>
	);
};

const SectionItems = ({ children, columns = 1 }: { children: ReactNode; columns?: number }) => {
	const data = useRender();
	const placement = useTemplatePlacement();
	const sectionTimeline = useTemplateFeature("sectionTimeline");
	const sectionItemsStyle = useTemplateStyle("sectionItems");
	const timelineItemsStyle = useTemplateFeatureStyle("sectionTimeline", "items");
	const timelineLineStyle = useTemplateFeatureStyle("sectionTimeline", "line");
	const metrics = getTemplateMetrics(data.metadata.page);
	const layout = getSectionItemsLayout({
		columns,
		rowGap: metrics.itemGapY,
		columnGap: metrics.itemGapX,
	});
	const useTimeline = shouldUseSectionTimeline({
		sectionTimeline,
		placement,
		columns: layout.columns,
	});
	const context = { itemStyle: layout.itemStyle, useTimeline };

	if (!useTimeline) {
		if (layout.isGrid) {
			const rows = getSectionItemRows(Children.toArray(children), layout.columns);

			return (
				<SectionItemsContext.Provider value={context}>
					<View style={composeStyles(layout.containerStyle, sectionItemsStyle)}>
						{rows.map((row, rowIndex) => (
							<View key={rowIndex} style={composeStyles(layout.rowStyle)}>
								{row}
								{Array.from({ length: layout.columns - row.length }, (_, index) => (
									<View key={`placeholder-${index}`} style={composeStyles(layout.itemStyle)} />
								))}
							</View>
						))}
					</View>
				</SectionItemsContext.Provider>
			);
		}

		return (
			<SectionItemsContext.Provider value={context}>
				<View style={composeStyles(layout.containerStyle, sectionItemsStyle)}>{children}</View>
			</SectionItemsContext.Provider>
		);
	}

	return (
		<SectionItemsContext.Provider value={context}>
			<View style={composeStyles(layout.containerStyle, sectionItemsStyle, timelineItemsStyle)}>
				<View style={composeStyles(timelineLineStyle)} />
				{children}
			</View>
		</SectionItemsContext.Provider>
	);
};

const SectionItem = ({ children, style }: { children: ReactNode; style?: StyleInput }) => {
	const { itemStyle: sectionItemStyle, useTimeline } = useSectionItemsContext();
	const itemStyle = useTemplateStyle("item");
	const timelineItemStyle = useTemplateFeatureStyle("sectionTimeline", "item");
	const timelineMarkerStyle = useTemplateFeatureStyle("sectionTimeline", "marker");
	const timelineDotStyle = useTemplateFeatureStyle("sectionTimeline", "dot");
	const timelineContentStyle = useTemplateFeatureStyle("sectionTimeline", "content");

	if (!useTimeline) {
		return <Div style={composeStyles(itemStyle, sectionItemStyle, style)}>{children}</Div>;
	}

	return (
		<View style={composeStyles(timelineItemStyle)}>
			<View style={composeStyles(timelineMarkerStyle)}>
				<View style={composeStyles(timelineDotStyle)} />
			</View>
			<Div style={composeStyles(itemStyle, timelineContentStyle, style)}>{children}</Div>
		</View>
	);
};

const InlineItemHeader = ({
	leading,
	middle,
	trailing,
}: {
	leading?: ReactNode;
	middle?: ReactNode;
	trailing?: ReactNode;
}) => {
	const inlineItemHeaderStyle = useTemplateStyle("inlineItemHeader");
	const leadingStyle = useTemplateStyle("inlineItemHeaderLeading");
	const middleStyle = useTemplateStyle("inlineItemHeaderMiddle");
	const trailingStyle = useTemplateStyle("inlineItemHeaderTrailing");

	return (
		<View style={composeStyles(inlineItemHeaderStyle)}>
			<View style={composeStyles(leadingStyle)}>{leading}</View>
			<View style={composeStyles(middleStyle)}>{middle}</View>
			<View style={composeStyles(trailingStyle)}>{trailing}</View>
		</View>
	);
};

const stackedSidebarSplitRowStyle = {
	flexDirection: "column",
	alignItems: "flex-start",
} satisfies Style;

const useSectionSplitRowStyle = () => {
	const splitRowStyle = useTemplateStyle("splitRow");
	const placement = useTemplatePlacement();
	const stackSidebarItemHeader = useTemplateFeature("stackSidebarItemHeader");

	return composeStyles(
		splitRowStyle,
		stackSidebarItemHeader && placement === "sidebar" ? stackedSidebarSplitRowStyle : undefined,
	);
};

const SectionItemHeader = ({ children }: { children: ReactNode }) => {
	const mainItemHeaderBorder = useTemplateFeature("mainItemHeaderBorder");
	const sectionItemHeaderStyle = useTemplateStyle("sectionItemHeader");

	if (!mainItemHeaderBorder) return <>{children}</>;

	return <View style={composeStyles(sectionItemHeaderStyle)}>{children}</View>;
};

const SummarySection = ({ showHeading = true }: { showHeading?: boolean } = {}) => {
	const data = useRender();
	const { summary } = data;

	if (!isVisibleSummary(summary)) return null;

	return (
		<SectionShell sectionId="summary" title={summary.title} showHeading={showHeading}>
			<SectionItems>
				<SectionItem>
					<RichText>{summary.content}</RichText>
				</SectionItem>
			</SectionItems>
		</SectionShell>
	);
};

const CustomSummarySection = ({
	section,
	showHeading = true,
}: {
	section: CustomItemSection<SummaryItem>;
	showHeading?: boolean;
}) => {
	const items = getVisibleItems(section);

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={section.id} title={section.title} showHeading={showHeading}>
			<SectionItems columns={section.columns}>
				{items.map((item) => (
					<SectionItem key={item.id}>
						<RichText>{item.content}</RichText>
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const ProfileSection = ({
	sectionId = "profiles",
	sectionData,
}: {
	sectionId?: string;
	sectionData?: ItemSection<ProfileItem>;
} = {}) => {
	const data = useRender();
	const profiles = sectionData ?? data.sections.profiles;
	const items = getVisibleItems(profiles);
	const inlineStyle = useTemplateStyle("inline");

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={profiles.title}>
			<SectionItems columns={profiles.columns}>
				{items.map((item) => (
					<SectionItem key={item.id}>
						<SectionItemHeader>
							<View style={composeStyles(inlineStyle)}>
								<Icon name={item.icon as IconName} />
								<Bold>{item.network}</Bold>
							</View>
						</SectionItemHeader>
						<Link src={item.website.url}>
							<Text>{item.username}</Text>
						</Link>
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const ExperienceSection = ({
	sectionId = "experience",
	sectionData,
}: {
	sectionId?: string;
	sectionData?: ItemSection<ExperienceItem>;
} = {}) => {
	const data = useRender();
	const experience = sectionData ?? data.sections.experience;
	const items = getVisibleItems(experience);
	const splitRowStyle = useSectionSplitRowStyle();
	const alignRightStyle = useTemplateStyle("alignRight");
	const inlineItemHeader = useTemplateFeature("inlineItemHeader");

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={experience.title}>
			<SectionItems columns={experience.columns}>
				{items.map((item) => {
					const hasPosition = Boolean(item.position.trim());
					const hasLocation = Boolean(item.location.trim());

					const renderInlineHeader = () => (
						<InlineItemHeader
							leading={
								hasPosition || hasLocation ? (
									<Text>
										{hasPosition ? item.position : ""}
										{hasPosition && hasLocation ? " " : ""}
										{hasLocation ? `(${item.location})` : ""}
									</Text>
								) : null
							}
							middle={<Bold>{item.company}</Bold>}
							trailing={<Text style={composeStyles(alignRightStyle)}>{item.period}</Text>}
						/>
					);

					const renderSplitHeader = () => (
						<>
							<View style={composeStyles(splitRowStyle)}>
								<Bold>{item.company}</Bold>
								<Text style={composeStyles(alignRightStyle)}>{item.location}</Text>
							</View>

							{item.roles.length === 0 && (
								<View style={composeStyles(splitRowStyle)}>
									<Text>{item.position}</Text>
									<Text style={composeStyles(alignRightStyle)}>{item.period}</Text>
								</View>
							)}
						</>
					);

					return (
						<SectionItem key={item.id}>
							<SectionItemHeader>{inlineItemHeader ? renderInlineHeader() : renderSplitHeader()}</SectionItemHeader>

							{item.roles.length > 0 && <MetaLine>{[item.period]}</MetaLine>}

							{item.roles.map((role) => (
								<View key={role.id}>
									<View style={composeStyles(splitRowStyle)}>
										<Text>{role.position}</Text>
										<Text style={composeStyles(alignRightStyle)}>{role.period}</Text>
									</View>
									<RichText>{role.description}</RichText>
								</View>
							))}

							{item.roles.length === 0 && <RichText>{item.description}</RichText>}

							{item.website.url && (
								<Link src={item.website.url}>
									<Small>{item.website.label || item.website.url}</Small>
								</Link>
							)}
						</SectionItem>
					);
				})}
			</SectionItems>
		</SectionShell>
	);
};

const EducationSection = ({
	sectionId = "education",
	sectionData,
}: {
	sectionId?: string;
	sectionData?: ItemSection<EducationItem>;
} = {}) => {
	const data = useRender();
	const education = sectionData ?? data.sections.education;
	const items = getVisibleItems(education);
	const splitRowStyle = useSectionSplitRowStyle();
	const alignRightStyle = useTemplateStyle("alignRight");
	const inlineItemHeader = useTemplateFeature("inlineItemHeader");

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={education.title}>
			<SectionItems columns={education.columns}>
				{items.map((item) => {
					const degreeAndGrade = [item.degree, item.grade].filter(Boolean).join(" • ");
					const locationAndPeriod = [item.location, item.period].filter(Boolean).join(" • ");
					const gradeAndLocation = [item.grade, item.location].filter(Boolean).join(" • ");
					const hasArea = Boolean(item.area.trim());
					const hasDegree = Boolean(item.degree.trim());

					const renderInlineHeader = () => (
						<>
							<InlineItemHeader
								leading={
									hasArea || hasDegree ? (
										<Text>
											{hasArea ? item.area : ""}
											{hasArea && hasDegree ? " " : ""}
											{hasDegree ? `(${item.degree})` : ""}
										</Text>
									) : null
								}
								middle={<Bold>{item.school}</Bold>}
								trailing={<Text style={composeStyles(alignRightStyle)}>{item.period}</Text>}
							/>
							{gradeAndLocation && <Text>{gradeAndLocation}</Text>}
						</>
					);

					const renderSplitHeader = () => (
						<>
							<View style={composeStyles(splitRowStyle)}>
								<Bold>{item.school}</Bold>
								<Text style={composeStyles(alignRightStyle)}>{degreeAndGrade}</Text>
							</View>

							<View style={composeStyles(splitRowStyle)}>
								<Text>{item.area}</Text>
								<Text style={composeStyles(alignRightStyle)}>{locationAndPeriod}</Text>
							</View>
						</>
					);

					return (
						<SectionItem key={item.id}>
							<SectionItemHeader>{inlineItemHeader ? renderInlineHeader() : renderSplitHeader()}</SectionItemHeader>

							<RichText>{item.description}</RichText>

							{item.website.url && (
								<Link src={item.website.url}>
									<Small>{item.website.label || item.website.url}</Small>
								</Link>
							)}
						</SectionItem>
					);
				})}
			</SectionItems>
		</SectionShell>
	);
};

const ProjectsSection = ({
	sectionId = "projects",
	sectionData,
}: {
	sectionId?: string;
	sectionData?: ItemSection<ProjectItem>;
} = {}) => {
	const data = useRender();
	const projects = sectionData ?? data.sections.projects;
	const items = getVisibleItems(projects);
	const splitRowStyle = useSectionSplitRowStyle();
	const alignRightStyle = useTemplateStyle("alignRight");

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={projects.title}>
			<SectionItems columns={projects.columns}>
				{items.map((item) => (
					<SectionItem key={item.id}>
						<SectionItemHeader>
							<View style={composeStyles(splitRowStyle)}>
								<Bold>{item.name}</Bold>
								<Text style={composeStyles(alignRightStyle)}>{item.period}</Text>
							</View>
						</SectionItemHeader>

						<RichText>{item.description}</RichText>

						{item.website.url && (
							<Link src={item.website.url}>
								<Small>{item.website.label || item.website.url}</Small>
							</Link>
						)}
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const SkillsSection = ({
	sectionId = "skills",
	sectionData,
}: {
	sectionId?: string;
	sectionData?: ItemSection<SkillItem>;
} = {}) => {
	const data = useRender();
	const skills = sectionData ?? data.sections.skills;
	const items = getVisibleItems(skills);
	const inlineStyle = useTemplateStyle("inline");
	const metrics = getTemplateMetrics(data.metadata.page);

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={skills.title}>
			<SectionItems columns={skills.columns}>
				{items.map((item) => (
					<SectionItem key={item.id} style={{ rowGap: metrics.gapY(0.25) }}>
						<SectionItemHeader>
							<View style={composeStyles(inlineStyle)}>
								<Icon name={item.icon as IconName} />
								<Bold>{item.name}</Bold>
							</View>
						</SectionItemHeader>

						<View>
							<Text>{item.proficiency}</Text>
							<Small>{item.keywords.join(", ")}</Small>
						</View>

						<LevelDisplay level={item.level} />
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const LanguagesSection = ({
	sectionId = "languages",
	sectionData,
}: {
	sectionId?: string;
	sectionData?: ItemSection<LanguageItem>;
} = {}) => {
	const data = useRender();
	const languages = sectionData ?? data.sections.languages;
	const items = getVisibleItems(languages);

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={languages.title}>
			<SectionItems columns={languages.columns}>
				{items.map((item) => (
					<SectionItem key={item.id}>
						<SectionItemHeader>
							<Bold>{item.language}</Bold>
							<Text>{item.fluency}</Text>
						</SectionItemHeader>
						<LevelDisplay level={item.level} />
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const InterestsSection = ({
	sectionId = "interests",
	sectionData,
}: {
	sectionId?: string;
	sectionData?: ItemSection<InterestItem>;
} = {}) => {
	const data = useRender();
	const interests = sectionData ?? data.sections.interests;
	const items = getVisibleItems(interests);
	const inlineStyle = useTemplateStyle("inline");

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={interests.title}>
			<SectionItems columns={interests.columns}>
				{items.map((item) => (
					<SectionItem key={item.id}>
						<SectionItemHeader>
							<View style={composeStyles(inlineStyle)}>
								<Icon name={item.icon as IconName} />
								<Bold>{item.name}</Bold>
							</View>
						</SectionItemHeader>

						<Small>{item.keywords.join(", ")}</Small>
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const AwardsSection = ({
	sectionId = "awards",
	sectionData,
}: {
	sectionId?: string;
	sectionData?: ItemSection<AwardItem>;
} = {}) => {
	const data = useRender();
	const awards = sectionData ?? data.sections.awards;
	const items = getVisibleItems(awards);

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={awards.title}>
			<SectionItems columns={awards.columns}>
				{items.map((item) => (
					<SectionItem key={item.id}>
						<SectionItemHeader>
							<Bold>{item.title}</Bold>
							<Text>{item.awarder}</Text>
							<Small>{item.date}</Small>
						</SectionItemHeader>
						<RichText>{item.description}</RichText>

						{item.website.url && (
							<Link src={item.website.url}>
								<Small>{item.website.label || item.website.url}</Small>
							</Link>
						)}
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const CertificationsSection = ({
	sectionId = "certifications",
	sectionData,
}: {
	sectionId?: string;
	sectionData?: ItemSection<CertificationItem>;
} = {}) => {
	const data = useRender();
	const certifications = sectionData ?? data.sections.certifications;
	const items = getVisibleItems(certifications);

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={certifications.title}>
			<SectionItems columns={certifications.columns}>
				{items.map((item) => (
					<SectionItem key={item.id}>
						<SectionItemHeader>
							<Bold>{item.title}</Bold>
							<Text>{item.issuer}</Text>
							<Small>{item.date}</Small>
						</SectionItemHeader>
						<RichText>{item.description}</RichText>

						{item.website.url && (
							<Link src={item.website.url}>
								<Small>{item.website.label || item.website.url}</Small>
							</Link>
						)}
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const PublicationsSection = ({
	sectionId = "publications",
	sectionData,
}: {
	sectionId?: string;
	sectionData?: ItemSection<PublicationItem>;
} = {}) => {
	const data = useRender();
	const publications = sectionData ?? data.sections.publications;
	const items = getVisibleItems(publications);

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={publications.title}>
			<SectionItems columns={publications.columns}>
				{items.map((item) => (
					<SectionItem key={item.id}>
						<SectionItemHeader>
							<Bold>{item.title}</Bold>
							<Text>{item.publisher}</Text>
							<Small>{item.date}</Small>
						</SectionItemHeader>
						<RichText>{item.description}</RichText>

						{item.website.url && (
							<Link src={item.website.url}>
								<Small>{item.website.label || item.website.url}</Small>
							</Link>
						)}
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const VolunteerSection = ({
	sectionId = "volunteer",
	sectionData,
}: {
	sectionId?: string;
	sectionData?: ItemSection<VolunteerItem>;
} = {}) => {
	const data = useRender();
	const volunteer = sectionData ?? data.sections.volunteer;
	const items = getVisibleItems(volunteer);
	const splitRowStyle = useSectionSplitRowStyle();
	const alignRightStyle = useTemplateStyle("alignRight");
	const inlineItemHeader = useTemplateFeature("inlineItemHeader");

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={volunteer.title}>
			<SectionItems columns={volunteer.columns}>
				{items.map((item) => (
					<SectionItem key={item.id}>
						<SectionItemHeader>
							{inlineItemHeader ? (
								<InlineItemHeader
									leading={<Text>{item.location}</Text>}
									middle={<Bold>{item.organization}</Bold>}
									trailing={<Text style={composeStyles(alignRightStyle)}>{item.period}</Text>}
								/>
							) : (
								<>
									<View style={composeStyles(splitRowStyle)}>
										<Bold>{item.organization}</Bold>
										<Text style={composeStyles(alignRightStyle)}>{item.location}</Text>
									</View>

									<MetaLine>{[item.period]}</MetaLine>
								</>
							)}
						</SectionItemHeader>
						<RichText>{item.description}</RichText>

						{item.website.url && (
							<Link src={item.website.url}>
								<Small>{item.website.label || item.website.url}</Small>
							</Link>
						)}
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const ReferencesSection = ({
	sectionId = "references",
	sectionData,
}: {
	sectionId?: string;
	sectionData?: ItemSection<ReferenceItem>;
} = {}) => {
	const data = useRender();
	const references = sectionData ?? data.sections.references;
	const items = getVisibleItems(references);

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={references.title}>
			<SectionItems columns={references.columns}>
				{items.map((item) => (
					<SectionItem key={item.id}>
						<SectionItemHeader>
							<Bold>{item.name}</Bold>
							<Text>{item.position}</Text>
							<MetaLine>{[item.phone]}</MetaLine>
						</SectionItemHeader>
						<RichText>{item.description}</RichText>

						{item.website.url && (
							<Link src={item.website.url}>
								<Small>{item.website.label || item.website.url}</Small>
							</Link>
						)}
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const CoverLetterSection = ({ section }: { section: CustomItemSection<CoverLetterItem> }) => {
	const items = getVisibleItems(section);

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={section.id} title={section.title} showHeading={false}>
			<SectionItems>
				{items.map((item) => (
					<SectionItem key={item.id}>
						<RichText>{item.recipient}</RichText>
						<RichText>{item.content}</RichText>
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const CustomSection = ({ sectionId, showHeading = true }: { sectionId: string; showHeading?: boolean }) => {
	const data = useRender();
	const customSection = data.customSections.find((section) => section.id === sectionId);

	if (!customSection) return null;

	return match(customSection.type)
		.with("summary", () => (
			<CustomSummarySection section={customSection as CustomItemSection<SummaryItem>} showHeading={showHeading} />
		))
		.with("profiles", () => (
			<ProfileSection sectionId={sectionId} sectionData={customSection as CustomItemSection<ProfileItem>} />
		))
		.with("experience", () => (
			<ExperienceSection sectionId={sectionId} sectionData={customSection as CustomItemSection<ExperienceItem>} />
		))
		.with("education", () => (
			<EducationSection sectionId={sectionId} sectionData={customSection as CustomItemSection<EducationItem>} />
		))
		.with("projects", () => (
			<ProjectsSection sectionId={sectionId} sectionData={customSection as CustomItemSection<ProjectItem>} />
		))
		.with("skills", () => (
			<SkillsSection sectionId={sectionId} sectionData={customSection as CustomItemSection<SkillItem>} />
		))
		.with("languages", () => (
			<LanguagesSection sectionId={sectionId} sectionData={customSection as CustomItemSection<LanguageItem>} />
		))
		.with("interests", () => (
			<InterestsSection sectionId={sectionId} sectionData={customSection as CustomItemSection<InterestItem>} />
		))
		.with("awards", () => (
			<AwardsSection sectionId={sectionId} sectionData={customSection as CustomItemSection<AwardItem>} />
		))
		.with("certifications", () => (
			<CertificationsSection
				sectionId={sectionId}
				sectionData={customSection as CustomItemSection<CertificationItem>}
			/>
		))
		.with("publications", () => (
			<PublicationsSection sectionId={sectionId} sectionData={customSection as CustomItemSection<PublicationItem>} />
		))
		.with("volunteer", () => (
			<VolunteerSection sectionId={sectionId} sectionData={customSection as CustomItemSection<VolunteerItem>} />
		))
		.with("references", () => (
			<ReferencesSection sectionId={sectionId} sectionData={customSection as CustomItemSection<ReferenceItem>} />
		))
		.with("cover-letter", () => <CoverLetterSection section={customSection as CustomItemSection<CoverLetterItem>} />)
		.exhaustive();
};

export const Section = ({
	section,
	placement,
	showHeading = true,
}: {
	section: string;
	placement: TemplatePlacement;
	showHeading?: boolean;
}) => {
	const data = useRender();

	if (!isSectionVisible(section, data)) return null;

	return (
		<TemplatePlacementProvider placement={placement}>
			{match(section)
				.with("summary", () => <SummarySection showHeading={showHeading} />)
				.with("profiles", () => <ProfileSection />)
				.with("experience", () => <ExperienceSection />)
				.with("education", () => <EducationSection />)
				.with("projects", () => <ProjectsSection />)
				.with("skills", () => <SkillsSection />)
				.with("languages", () => <LanguagesSection />)
				.with("interests", () => <InterestsSection />)
				.with("awards", () => <AwardsSection />)
				.with("certifications", () => <CertificationsSection />)
				.with("publications", () => <PublicationsSection />)
				.with("volunteer", () => <VolunteerSection />)
				.with("references", () => <ReferencesSection />)
				.otherwise(() => (
					<CustomSection sectionId={section} showHeading={showHeading} />
				))}
		</TemplatePlacementProvider>
	);
};
