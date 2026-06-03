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
import { Children, createContext, isValidElement, use } from "react";
import { match } from "ts-pattern";
import { useRender } from "../../context";
import { Image, View } from "../../renderer";
import { getResumeSectionIcon } from "../../section-icon";
import { getResumeSectionTitle } from "../../section-title";
import { getSectionItemRows, getSectionItemsLayout, shouldUseSectionTimeline } from "./columns";
import { getWebsiteDisplayText } from "./contact";
import {
	SectionStyleProvider,
	TemplatePlacementProvider,
	useSectionStyleRule,
	useTemplateFeature,
	useTemplateFeatureStyle,
	useTemplatePlacement,
	useTemplateStyle,
} from "./context";
import { filterItems, hasVisibleItems, isSectionVisible, isVisibleSummary } from "./filtering";
import { hasItemLogo } from "./item-image";
import { LevelDisplay } from "./level-display";
import { getTemplateMetrics } from "./metrics";
import { Bold, Div, Heading, Icon, Link, SectionHeadingIcon, Small, Text } from "./primitives";
import { RichText } from "./rich-text";
import { createRtlStyleHelpers } from "./rtl";
import { getInlineItemWebsiteUrl, shouldRenderSeparateItemWebsite } from "./section-links";
import { hasSplitRowText, promoteSplitRowRight } from "./split-row";
import { getSectionStyleRuleContext } from "./style-rules";
import { composeStyles } from "./styles";

type SectionItemsContextValue = {
	itemStyle: StyleInput;
	useTimeline: boolean;
};

type SectionShellProps = {
	sectionId: string;
	title: string;
	showHeading?: boolean;
	children: ReactNode;
};

type SectionItemsProps = {
	children: ReactNode;
	columns?: number;
};

type SectionItemProps = {
	children: ReactNode;
	style?: StyleInput;
};

type InlineItemHeaderProps = {
	leading?: ReactNode;
	middle?: ReactNode;
	trailing?: ReactNode;
	center?: boolean;
};

type SectionItemHeaderProps = {
	children: ReactNode;
};

type ItemWebsite = {
	url: string;
	label: string;
	inlineLink?: boolean | undefined;
};

type ItemTitleProps = {
	children: ReactNode;
	website: ItemWebsite;
};

type ItemWebsiteLinkProps = {
	website: ItemWebsite;
};

type SummarySectionProps = {
	showHeading?: boolean;
};

type CustomSummarySectionProps = {
	section: CustomItemSection<SummaryItem>;
	showHeading?: boolean;
};

type ItemSectionProps<T> = {
	sectionId?: string;
	sectionData?: ItemSection<T>;
};

type CoverLetterSectionProps = {
	section: CustomItemSection<CoverLetterItem>;
};

type CustomSectionProps = {
	sectionId: string;
	showHeading?: boolean;
};

type SectionProps = {
	section: string;
	placement: TemplatePlacement;
	showHeading?: boolean;
};

const SectionItemsContext = createContext<SectionItemsContextValue>({ itemStyle: undefined, useTimeline: false });
const SECTION_ITEM_PLACEHOLDER_KEYS = [
	"placeholder-1",
	"placeholder-2",
	"placeholder-3",
	"placeholder-4",
	"placeholder-5",
	"placeholder-6",
] as const;

const defaultSectionHeadingContainerStyle = {
	flexDirection: "row",
	alignItems: "flex-start",
	columnGap: 4,
} satisfies Style;

const getSectionHeadingTextStyle = (...styles: StyleInput[]): Style[] =>
	composeStyles(...styles).map(
		({
			borderBottomWidth: _borderBottomWidth,
			borderLeftWidth: _borderLeftWidth,
			borderRightWidth: _borderRightWidth,
			borderTopWidth: _borderTopWidth,
			borderWidth: _borderWidth,
			flexGrow: _flexGrow,
			flexShrink: _flexShrink,
			marginBottom: _marginBottom,
			marginLeft: _marginLeft,
			marginRight: _marginRight,
			marginTop: _marginTop,
			paddingBottom: _paddingBottom,
			paddingLeft: _paddingLeft,
			paddingRight: _paddingRight,
			paddingTop: _paddingTop,
			width: _width,
			...textStyle
		}) => textStyle,
	);

const useSectionItemsContext = () => use(SectionItemsContext);

const getChildKey = (child: ReactNode, fallbackIndex: number) => {
	return isValidElement(child) && child.key !== null ? String(child.key) : `child-${fallbackIndex}`;
};

const getRowKey = (row: ReactNode[], rowIndex: number) => {
	const childKeys = row.map(getChildKey).join("|");
	return childKeys || `row-${rowIndex}`;
};

const getVisibleItems = <T extends { hidden: boolean }>(section: ItemSection<T>, sectionType?: string): T[] => {
	if (!hasVisibleItems(section, sectionType)) return [];

	return filterItems(section.items, sectionType);
};

const SectionShell = ({ sectionId, title, showHeading = true, children }: SectionShellProps) => {
	const data = useRender();
	const sectionStyle = useTemplateStyle("section");
	const sectionRuleStyle = useSectionStyleRule("section");
	const sectionHeadingStyle = useTemplateStyle("sectionHeading");
	const sectionHeadingContainerStyle = useTemplateStyle("sectionHeadingContainer");
	const sectionHeadingRuleStyle = useSectionStyleRule("heading");
	const sectionTitle = getResumeSectionTitle(data, sectionId, title);
	const sectionIcon = getResumeSectionIcon(data, sectionId);
	const showIcon = Boolean(sectionIcon) && !data.metadata.page.hideSectionIcons;

	if (!showIcon) {
		// No icon: render heading exactly as before (no structural change)
		return (
			<View style={composeStyles(sectionStyle, sectionRuleStyle)}>
				{showHeading && (
					<Heading style={composeStyles(sectionHeadingStyle, sectionHeadingRuleStyle)}>{sectionTitle}</Heading>
				)}
				{children}
			</View>
		);
	}

	// With icon: wrap in a flex row container that inherits the heading's border/decoration
	return (
		<View style={composeStyles(sectionStyle, sectionRuleStyle)}>
			{showHeading && (
				<View
					style={composeStyles(
						sectionHeadingStyle,
						defaultSectionHeadingContainerStyle,
						sectionHeadingContainerStyle,
						sectionHeadingRuleStyle,
					)}
				>
					<SectionHeadingIcon name={sectionIcon as IconName} />
					<Heading style={getSectionHeadingTextStyle(sectionHeadingStyle, sectionHeadingRuleStyle)}>
						{sectionTitle}
					</Heading>
				</View>
			)}
			{children}
		</View>
	);
};

const SectionItems = ({ children, columns = 1 }: SectionItemsProps) => {
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
	const rtlRowStyle = createRtlStyleHelpers(data.rtl).gridRowStyle;

	if (!useTimeline) {
		if (layout.isGrid) {
			const rows = getSectionItemRows(Children.toArray(children), layout.columns);

			return (
				<SectionItemsContext.Provider value={context}>
					<View style={composeStyles(layout.containerStyle, sectionItemsStyle)}>
						{rows.map((row, rowIndex) => (
							<View key={getRowKey(row, rowIndex)} style={composeStyles(layout.rowStyle, rtlRowStyle)}>
								{row}
								{SECTION_ITEM_PLACEHOLDER_KEYS.slice(0, layout.columns - row.length).map((placeholderKey) => (
									<View key={placeholderKey} style={composeStyles(layout.itemStyle)} />
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

const SectionItem = ({ children, style }: SectionItemProps) => {
	const { itemStyle: sectionItemStyle, useTimeline } = useSectionItemsContext();
	const itemStyle = useTemplateStyle("item");
	const itemRuleStyle = useSectionStyleRule("item");
	const timelineItemStyle = useTemplateFeatureStyle("sectionTimeline", "item");
	const timelineMarkerStyle = useTemplateFeatureStyle("sectionTimeline", "marker");
	const timelineDotStyle = useTemplateFeatureStyle("sectionTimeline", "dot");
	const timelineContentStyle = useTemplateFeatureStyle("sectionTimeline", "content");

	if (!useTimeline) {
		return <Div style={composeStyles(itemStyle, itemRuleStyle, sectionItemStyle, style)}>{children}</Div>;
	}

	return (
		<View style={composeStyles(timelineItemStyle)}>
			<View style={composeStyles(timelineMarkerStyle)}>
				<View style={composeStyles(timelineDotStyle)} />
			</View>
			<Div style={composeStyles(itemStyle, itemRuleStyle, timelineContentStyle, style)}>{children}</Div>
		</View>
	);
};

const InlineItemHeader = ({ leading, middle, trailing, center }: InlineItemHeaderProps) => {
	const inlineItemHeaderStyle = useTemplateStyle("inlineItemHeader");
	const leadingStyle = useTemplateStyle("inlineItemHeaderLeading");
	const middleStyle = useTemplateStyle("inlineItemHeaderMiddle");
	const trailingStyle = useTemplateStyle("inlineItemHeaderTrailing");

	return (
		<View style={composeStyles(inlineItemHeaderStyle, center ? { alignItems: "center" } : undefined)}>
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

const awardTitleDateRowStyle = {
	flexDirection: "row",
	alignItems: "flex-start",
	justifyContent: "space-between",
} satisfies Style;

const useSectionSplitRowStyle = () => {
	const placement = useTemplatePlacement();
	const splitRowStyle = useTemplateStyle("splitRow");
	const stackSidebarItemHeader = useTemplateFeature("stackSidebarItemHeader");

	return composeStyles(
		splitRowStyle,
		stackSidebarItemHeader && placement === "sidebar" ? stackedSidebarSplitRowStyle : undefined,
	);
};

const SectionItemHeader = ({ children }: SectionItemHeaderProps) => {
	const mainItemHeaderBorder = useTemplateFeature("mainItemHeaderBorder");
	const sectionItemHeaderStyle = useTemplateStyle("sectionItemHeader");

	if (!mainItemHeaderBorder) return <>{children}</>;

	return <View style={composeStyles(sectionItemHeaderStyle)}>{children}</View>;
};

const ItemTitle = ({ children, website }: ItemTitleProps) => {
	const inlineWebsiteUrl = getInlineItemWebsiteUrl(website);
	const title = <Bold>{children}</Bold>;

	if (!inlineWebsiteUrl) return title;

	return <Link src={inlineWebsiteUrl}>{title}</Link>;
};

const ItemWebsiteLink = ({ website }: ItemWebsiteLinkProps) => {
	if (!shouldRenderSeparateItemWebsite(website)) return null;

	return <Link src={website.url}>{getWebsiteDisplayText(website)}</Link>;
};

const SummarySection = ({ showHeading = true }: SummarySectionProps = {}) => {
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

const CustomSummarySection = ({ section, showHeading = true }: CustomSummarySectionProps) => {
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

const ProfileSection = ({ sectionId = "profiles", sectionData }: ItemSectionProps<ProfileItem> = {}) => {
	const data = useRender();
	const profiles = sectionData ?? data.sections.profiles;
	const items = getVisibleItems(profiles, "profiles");
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
						<Link src={item.website.url}>{item.username}</Link>
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const ExperienceSection = ({ sectionId = "experience", sectionData }: ItemSectionProps<ExperienceItem> = {}) => {
	const data = useRender();
	const experience = sectionData ?? data.sections.experience;
	const items = getVisibleItems(experience, "experience");
	const splitRowStyle = useSectionSplitRowStyle();
	const alignEndStyle = useTemplateStyle("alignEnd");
	const inlineItemHeader = useTemplateFeature("inlineItemHeader");

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={experience.title}>
			<SectionItems columns={experience.columns}>
				{items.map((item) => {
					const hasPosition = Boolean(item.position.trim());
					const hasLocation = Boolean(item.location.trim());
					const { top: headerLocation, bottom: headerPeriod } = promoteSplitRowRight({
						top: item.location,
						bottom: item.period,
					});

					const renderInlineHeader = () => (
						<InlineItemHeader
							center={hasItemLogo(item.logo)}
							leading={
								hasPosition || hasLocation ? (
									<Text>
										{hasPosition ? item.position : ""}
										{hasPosition && hasLocation ? " " : ""}
										{hasLocation ? `(${item.location})` : ""}
									</Text>
								) : null
							}
							middle={
								hasItemLogo(item.logo) ? (
									<View style={{ flexDirection: "row", alignItems: "center", columnGap: 4 }}>
										<Image
											src={item.logo.url}
											style={{
												width: item.logo.size,
												height: item.logo.size,
												borderRadius: item.logo.borderRadius,
												objectFit: "contain",
												flexShrink: 0,
											}}
										/>
										<View style={{ flex: 1 }}>
											<ItemTitle website={item.website}>{item.company}</ItemTitle>
										</View>
									</View>
								) : (
									<ItemTitle website={item.website}>{item.company}</ItemTitle>
								)
							}
							trailing={<Text style={composeStyles(alignEndStyle)}>{item.period}</Text>}
						/>
					);

					const renderSplitHeader = () => (
						<>
							<View style={composeStyles(splitRowStyle)}>
								{hasItemLogo(item.logo) ? (
									<View style={{ flexDirection: "row", alignItems: "center", columnGap: 4 }}>
										<Image
											src={item.logo.url}
											style={{
												width: item.logo.size,
												height: item.logo.size,
												borderRadius: item.logo.borderRadius,
												objectFit: "contain",
												flexShrink: 0,
											}}
										/>
										<View style={{ flex: 1 }}>
											<ItemTitle website={item.website}>{item.company}</ItemTitle>
										</View>
									</View>
								) : (
									<ItemTitle website={item.website}>{item.company}</ItemTitle>
								)}
								{hasSplitRowText(headerLocation) && <Text style={composeStyles(alignEndStyle)}>{headerLocation}</Text>}
							</View>

							{(hasPosition || hasSplitRowText(headerPeriod)) && (
								<View style={composeStyles(splitRowStyle)}>
									{hasPosition && <Text>{item.position}</Text>}
									{hasSplitRowText(headerPeriod) && <Text style={composeStyles(alignEndStyle)}>{headerPeriod}</Text>}
								</View>
							)}
						</>
					);

					return (
						<SectionItem key={item.id}>
							<SectionItemHeader>{inlineItemHeader ? renderInlineHeader() : renderSplitHeader()}</SectionItemHeader>

							{item.roles.map((role) => (
								<View key={role.id}>
									<View style={composeStyles(splitRowStyle)}>
										<Text>{role.position}</Text>
										<Text style={composeStyles(alignEndStyle)}>{role.period}</Text>
									</View>
									<RichText>{role.description}</RichText>
								</View>
							))}

							{item.roles.length === 0 && <RichText>{item.description}</RichText>}

							<ItemWebsiteLink website={item.website} />
						</SectionItem>
					);
				})}
			</SectionItems>
		</SectionShell>
	);
};

const EducationSection = ({ sectionId = "education", sectionData }: ItemSectionProps<EducationItem> = {}) => {
	const data = useRender();
	const education = sectionData ?? data.sections.education;
	const items = getVisibleItems(education, "education");
	const splitRowStyle = useSectionSplitRowStyle();
	const alignEndStyle = useTemplateStyle("alignEnd");
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
					const { top: headerDegreeAndGrade, bottom: headerLocationAndPeriod } = promoteSplitRowRight({
						top: degreeAndGrade,
						bottom: locationAndPeriod,
					});

					const renderInlineHeader = () => (
						<>
							<InlineItemHeader
								center={hasItemLogo(item.logo)}
								leading={
									hasArea || hasDegree ? (
										<Text>
											{hasArea ? item.area : ""}
											{hasArea && hasDegree ? " " : ""}
											{hasDegree ? `(${item.degree})` : ""}
										</Text>
									) : null
								}
								middle={
									hasItemLogo(item.logo) ? (
										<View style={{ flexDirection: "row", alignItems: "center", columnGap: 4 }}>
											<Image
												src={item.logo.url}
												style={{
													width: item.logo.size,
													height: item.logo.size,
													borderRadius: item.logo.borderRadius,
													objectFit: "contain",
													flexShrink: 0,
												}}
											/>
											<View style={{ flex: 1 }}>
												<ItemTitle website={item.website}>{item.school}</ItemTitle>
											</View>
										</View>
									) : (
										<ItemTitle website={item.website}>{item.school}</ItemTitle>
									)
								}
								trailing={<Text style={composeStyles(alignEndStyle)}>{item.period}</Text>}
							/>
							{gradeAndLocation && <Text>{gradeAndLocation}</Text>}
						</>
					);

					const renderSplitHeader = () => (
						<>
							<View style={composeStyles(splitRowStyle)}>
								{hasItemLogo(item.logo) ? (
									<View style={{ flexDirection: "row", alignItems: "center", columnGap: 4 }}>
										<Image
											src={item.logo.url}
											style={{
												width: item.logo.size,
												height: item.logo.size,
												borderRadius: item.logo.borderRadius,
												objectFit: "contain",
												flexShrink: 0,
											}}
										/>
										<View style={{ flex: 1 }}>
											<ItemTitle website={item.website}>{item.school}</ItemTitle>
										</View>
									</View>
								) : (
									<ItemTitle website={item.website}>{item.school}</ItemTitle>
								)}
								{hasSplitRowText(headerDegreeAndGrade) && (
									<Text style={composeStyles(alignEndStyle)}>{headerDegreeAndGrade}</Text>
								)}
							</View>

							{(hasArea || hasSplitRowText(headerLocationAndPeriod)) && (
								<View style={composeStyles(splitRowStyle)}>
									{hasArea && <Text>{item.area}</Text>}
									{hasSplitRowText(headerLocationAndPeriod) && (
										<Text style={composeStyles(alignEndStyle)}>{headerLocationAndPeriod}</Text>
									)}
								</View>
							)}
						</>
					);

					return (
						<SectionItem key={item.id}>
							<SectionItemHeader>{inlineItemHeader ? renderInlineHeader() : renderSplitHeader()}</SectionItemHeader>

							<RichText>{item.description}</RichText>

							<ItemWebsiteLink website={item.website} />
						</SectionItem>
					);
				})}
			</SectionItems>
		</SectionShell>
	);
};

const ProjectsSection = ({ sectionId = "projects", sectionData }: ItemSectionProps<ProjectItem> = {}) => {
	const data = useRender();
	const projects = sectionData ?? data.sections.projects;
	const items = getVisibleItems(projects, "projects");
	const splitRowStyle = useSectionSplitRowStyle();
	const alignEndStyle = useTemplateStyle("alignEnd");

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={projects.title}>
			<SectionItems columns={projects.columns}>
				{items.map((item) => (
					<SectionItem key={item.id}>
						<SectionItemHeader>
							<View style={composeStyles(splitRowStyle)}>
								<ItemTitle website={item.website}>{item.name}</ItemTitle>
								<Text style={composeStyles(alignEndStyle)}>{item.period}</Text>
							</View>
						</SectionItemHeader>

						<RichText>{item.description}</RichText>

						<ItemWebsiteLink website={item.website} />
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const SkillsSection = ({ sectionId = "skills", sectionData }: ItemSectionProps<SkillItem> = {}) => {
	const data = useRender();
	const skills = sectionData ?? data.sections.skills;
	const items = getVisibleItems(skills, "skills");
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

const LanguagesSection = ({ sectionId = "languages", sectionData }: ItemSectionProps<LanguageItem> = {}) => {
	const data = useRender();
	const languages = sectionData ?? data.sections.languages;
	const items = getVisibleItems(languages, "languages");

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

const InterestsSection = ({ sectionId = "interests", sectionData }: ItemSectionProps<InterestItem> = {}) => {
	const data = useRender();
	const interests = sectionData ?? data.sections.interests;
	const items = getVisibleItems(interests, "interests");
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

const AwardsSection = ({ sectionId = "awards", sectionData }: ItemSectionProps<AwardItem> = {}) => {
	const data = useRender();
	const awards = sectionData ?? data.sections.awards;
	const items = getVisibleItems(awards, "awards");
	const splitRowStyle = useTemplateStyle("splitRow");
	const alignEndStyle = useTemplateStyle("alignEnd");

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={awards.title}>
			<SectionItems columns={awards.columns}>
				{items.map((item) => (
					<SectionItem key={item.id}>
						<SectionItemHeader>
							<View style={composeStyles(splitRowStyle, awardTitleDateRowStyle)}>
								<ItemTitle website={item.website}>{item.title}</ItemTitle>
								<Text style={composeStyles(alignEndStyle)}>{item.date}</Text>
							</View>
							<Text>{item.awarder}</Text>
						</SectionItemHeader>
						<RichText>{item.description}</RichText>

						<ItemWebsiteLink website={item.website} />
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const CertificationsSection = ({
	sectionId = "certifications",
	sectionData,
}: ItemSectionProps<CertificationItem> = {}) => {
	const data = useRender();
	const certifications = sectionData ?? data.sections.certifications;
	const items = getVisibleItems(certifications, "certifications");
	const splitRowStyle = useSectionSplitRowStyle();
	const alignEndStyle = useTemplateStyle("alignEnd");

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={certifications.title}>
			<SectionItems columns={certifications.columns}>
				{items.map((item) => (
					<SectionItem key={item.id}>
						<SectionItemHeader>
							<View style={composeStyles(splitRowStyle)}>
								<ItemTitle website={item.website}>{item.title}</ItemTitle>
								<Text style={composeStyles(alignEndStyle)}>{item.date}</Text>
							</View>
							<Text>{item.issuer}</Text>
						</SectionItemHeader>

						<RichText>{item.description}</RichText>

						<ItemWebsiteLink website={item.website} />
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const PublicationsSection = ({ sectionId = "publications", sectionData }: ItemSectionProps<PublicationItem> = {}) => {
	const data = useRender();
	const publications = sectionData ?? data.sections.publications;
	const items = getVisibleItems(publications, "publications");
	const splitRowStyle = useSectionSplitRowStyle();
	const alignEndStyle = useTemplateStyle("alignEnd");

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={publications.title}>
			<SectionItems columns={publications.columns}>
				{items.map((item) => (
					<SectionItem key={item.id}>
						<SectionItemHeader>
							<View style={composeStyles(splitRowStyle)}>
								<ItemTitle website={item.website}>{item.title}</ItemTitle>
								<Text style={composeStyles(alignEndStyle)}>{item.date}</Text>
							</View>

							<Text>{item.publisher}</Text>
						</SectionItemHeader>

						<RichText>{item.description}</RichText>

						<ItemWebsiteLink website={item.website} />
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const VolunteerSection = ({ sectionId = "volunteer", sectionData }: ItemSectionProps<VolunteerItem> = {}) => {
	const data = useRender();
	const volunteer = sectionData ?? data.sections.volunteer;
	const items = getVisibleItems(volunteer, "volunteer");
	const splitRowStyle = useSectionSplitRowStyle();
	const alignEndStyle = useTemplateStyle("alignEnd");
	const inlineItemHeader = useTemplateFeature("inlineItemHeader");

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={volunteer.title}>
			<SectionItems columns={volunteer.columns}>
				{items.map((item) => {
					return (
						<SectionItem key={item.id}>
							<SectionItemHeader>
								{inlineItemHeader ? (
									<InlineItemHeader
										leading={hasSplitRowText(item.location) ? <Text>{item.location}</Text> : null}
										middle={<ItemTitle website={item.website}>{item.organization}</ItemTitle>}
										trailing={<Text style={composeStyles(alignEndStyle)}>{item.period}</Text>}
									/>
								) : (
									<>
										<View style={composeStyles(splitRowStyle)}>
											<ItemTitle website={item.website}>{item.organization}</ItemTitle>
											{hasSplitRowText(item.period) && <Text style={composeStyles(alignEndStyle)}>{item.period}</Text>}
										</View>

										<Text>{item.location}</Text>
									</>
								)}
							</SectionItemHeader>
							<RichText>{item.description}</RichText>

							<ItemWebsiteLink website={item.website} />
						</SectionItem>
					);
				})}
			</SectionItems>
		</SectionShell>
	);
};

const ReferencesSection = ({ sectionId = "references", sectionData }: ItemSectionProps<ReferenceItem> = {}) => {
	const data = useRender();
	const references = sectionData ?? data.sections.references;
	const items = getVisibleItems(references, "references");

	if (items.length === 0) return null;

	return (
		<SectionShell sectionId={sectionId} title={references.title}>
			<SectionItems columns={references.columns}>
				{items.map((item) => (
					<SectionItem key={item.id}>
						<SectionItemHeader>
							<ItemTitle website={item.website}>{item.name}</ItemTitle>
							<Text>{item.position}</Text>
							<Text>{item.phone}</Text>
						</SectionItemHeader>
						<RichText>{item.description}</RichText>

						<ItemWebsiteLink website={item.website} />
					</SectionItem>
				))}
			</SectionItems>
		</SectionShell>
	);
};

const CoverLetterSection = ({ section }: CoverLetterSectionProps) => {
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

const CustomSection = ({ sectionId, showHeading = true }: CustomSectionProps) => {
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

export const Section = ({ section, placement, showHeading = true }: SectionProps) => {
	const data = useRender();

	if (!isSectionVisible(section, data)) return null;

	return (
		<TemplatePlacementProvider placement={placement}>
			<SectionStyleProvider context={getSectionStyleRuleContext(data, section)}>
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
			</SectionStyleProvider>
		</TemplatePlacementProvider>
	);
};
