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
type CustomOnlyType = "cover-letter";

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
			.with("picture", () => "Picture")
			.with("basics", () => "Basics")
			.with("summary", () => "Summary")
			.with("profiles", () => "Profiles")
			.with("experience", () => "Experience")
			.with("education", () => "Education")
			.with("projects", () => "Projects")
			.with("skills", () => "Skills")
			.with("languages", () => "Languages")
			.with("interests", () => "Interests")
			.with("awards", () => "Awards")
			.with("certifications", () => "Certifications")
			.with("publications", () => "Publications")
			.with("volunteer", () => "Volunteer")
			.with("references", () => "References")
			.with("custom", () => "Custom Sections")

			// Custom Section Types (not in main sidebar)
			.with("cover-letter", () => "Cover Letter")

			// Right Sidebar Sections
			.with("template", () => "Template")
			.with("layout", () => "Layout")
			.with("typography", () => "Typography")
			.with("design", () => "Design")
			.with("page", () => "Page")
			.with("css", () => "Custom CSS")
			.with("notes", () => "Notes")
			.with("sharing", () => "Sharing")
			.with("statistics", () => "Statistics")
			.with("export", () => "Export")
			.with("information", () => "Information")

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
