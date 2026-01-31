import { t } from "@lingui/core/macro";
import {
	ArticleIcon,
	BooksIcon,
	BriefcaseIcon,
	CertificateIcon,
	ChartLineIcon,
	CodeSimpleIcon,
	CompassToolIcon,
	DiamondsFourIcon,
	DownloadIcon,
	EnvelopeSimpleIcon,
	FileCssIcon,
	FootballIcon,
	GraduationCapIcon,
	HandHeartIcon,
	type IconProps,
	ImageIcon,
	InfoIcon,
	LayoutIcon,
	MessengerLogoIcon,
	NotepadIcon,
	PaletteIcon,
	PhoneIcon,
	ReadCvLogoIcon,
	ShareFatIcon,
	StarIcon,
	TextTIcon,
	TranslateIcon,
	TrophyIcon,
	UserIcon,
} from "@phosphor-icons/react";
import { match } from "ts-pattern";
import type { SectionType } from "@/schema/resume/data";
import { cn } from "../style";

export type LeftSidebarSection = "picture" | "basics" | "summary" | SectionType | "custom";

// CustomSectionType values that are not in SectionType (used in custom sections only)
export type CustomOnlyType = "cover-letter";

export type RightSidebarSection =
	| "template"
	| "layout"
	| "typography"
	| "design"
	| "page"
	| "css"
	| "notes"
	| "sharing"
	| "statistics"
	| "export"
	| "information";

export type SidebarSection = LeftSidebarSection | RightSidebarSection;

export const leftSidebarSections: LeftSidebarSection[] = [
	"picture",
	"basics",
	"summary",
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
	"custom",
] as const;

export const rightSidebarSections: RightSidebarSection[] = [
	"template",
	"layout",
	"typography",
	"design",
	"page",
	"css",
	"notes",
	"sharing",
	"statistics",
	"export",
	"information",
] as const;

export const getSectionTitle = (type: SidebarSection | CustomOnlyType): string => {
	return (
		match(type)
			// Left Sidebar Sections
			.with("picture", () => t`Picture`)
			.with("basics", () => t`Basics`)
			.with("summary", () => t`Summary`)
			.with("profiles", () => t`Profiles`)
			.with("experience", () => t`Experience`)
			.with("education", () => t`Education`)
			.with("projects", () => t`Projects`)
			.with("skills", () => t`Skills`)
			.with("languages", () => t`Languages`)
			.with("interests", () => t`Interests`)
			.with("awards", () => t`Awards`)
			.with("certifications", () => t`Certifications`)
			.with("publications", () => t`Publications`)
			.with("volunteer", () => t`Volunteer`)
			.with("references", () => t`References`)
			.with("custom", () => t`Custom Sections`)

			// Custom Section Types (not in main sidebar)
			.with("cover-letter", () => t`Cover Letter`)

			// Right Sidebar Sections
			.with("template", () => t`Template`)
			.with("layout", () => t`Layout`)
			.with("typography", () => t`Typography`)
			.with("design", () => t`Design`)
			.with("page", () => t`Page`)
			.with("css", () => t`Custom CSS`)
			.with("notes", () => t`Notes`)
			.with("sharing", () => t`Sharing`)
			.with("statistics", () => t`Statistics`)
			.with("export", () => t`Export`)
			.with("information", () => t`Information`)

			.exhaustive()
	);
};

export const getSectionIcon = (type: SidebarSection | CustomOnlyType, props?: IconProps): React.ReactNode => {
	const iconProps = { ...props, className: cn("shrink-0", props?.className) };

	return (
		match(type)
			// Left Sidebar Sections
			.with("picture", () => <ImageIcon {...iconProps} />)
			.with("basics", () => <UserIcon {...iconProps} />)
			.with("summary", () => <ArticleIcon {...iconProps} />)
			.with("profiles", () => <MessengerLogoIcon {...iconProps} />)
			.with("experience", () => <BriefcaseIcon {...iconProps} />)
			.with("education", () => <GraduationCapIcon {...iconProps} />)
			.with("projects", () => <CodeSimpleIcon {...iconProps} />)
			.with("skills", () => <CompassToolIcon {...iconProps} />)
			.with("languages", () => <TranslateIcon {...iconProps} />)
			.with("interests", () => <FootballIcon {...iconProps} />)
			.with("awards", () => <TrophyIcon {...iconProps} />)
			.with("certifications", () => <CertificateIcon {...iconProps} />)
			.with("publications", () => <BooksIcon {...iconProps} />)
			.with("volunteer", () => <HandHeartIcon {...iconProps} />)
			.with("references", () => <PhoneIcon {...iconProps} />)
			.with("custom", () => <StarIcon {...iconProps} />)

			// Custom Section Types (not in main sidebar)
			.with("cover-letter", () => <EnvelopeSimpleIcon {...iconProps} />)

			// Right Sidebar Sections
			.with("template", () => <DiamondsFourIcon {...iconProps} />)
			.with("layout", () => <LayoutIcon {...iconProps} />)
			.with("typography", () => <TextTIcon {...iconProps} />)
			.with("design", () => <PaletteIcon {...iconProps} />)
			.with("page", () => <ReadCvLogoIcon {...iconProps} />)
			.with("css", () => <FileCssIcon {...iconProps} />)
			.with("notes", () => <NotepadIcon {...iconProps} />)
			.with("sharing", () => <ShareFatIcon {...iconProps} />)
			.with("statistics", () => <ChartLineIcon {...iconProps} />)
			.with("export", () => <DownloadIcon {...iconProps} />)
			.with("information", () => <InfoIcon {...iconProps} />)

			.exhaustive()
	);
};
