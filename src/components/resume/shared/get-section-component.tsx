import { match } from "ts-pattern";

import type {
  CoverLetterItem as CoverLetterItemType,
  CustomSectionItem,
  CustomSectionType,
  SectionItem,
  SectionType,
  SummaryItem as SummaryItemType,
} from "@/schema/resume/data";

import { cn } from "@/utils/style";

import { useResumeStore } from "../store/resume";
import { AwardsItem } from "./items/awards-item";
import { CertificationsItem } from "./items/certifications-item";
import { CoverLetterItem } from "./items/cover-letter-item";
import { EducationItem } from "./items/education-item";
import { ExperienceItem } from "./items/experience-item";
import { InterestsItem } from "./items/interests-item";
import { LanguagesItem } from "./items/languages-item";
import { ProfilesItem } from "./items/profiles-item";
import { ProjectsItem } from "./items/projects-item";
import { PublicationsItem } from "./items/publications-item";
import { ReferencesItem } from "./items/references-item";
import { SkillsItem } from "./items/skills-item";
import { SummaryItem } from "./items/summary-item";
import { VolunteerItem } from "./items/volunteer-item";
import { PageSection } from "./page-section";
import { PageSummary } from "./page-summary";

/**
 * Extra props forwarded by a template to each rendered item. Used by templates
 * (e.g., Meowth) to opt-in to alternative item renderings such as an inline
 * three-column header. Only item components that declare the corresponding
 * prop will react to it; others simply ignore the extra props via spread.
 */
type ItemProps = {
  headerLayout?: "split" | "inline";
};

type SectionComponentProps = {
  sectionClassName?: string;
  itemClassName?: string;
  itemProps?: ItemProps;
};

// Helper to render item component based on type
function renderItemByType(
  type: CustomSectionType,
  item: CustomSectionItem,
  itemClassName?: string,
  itemProps?: ItemProps,
) {
  return match(type)
    .with("summary", () => <SummaryItem {...(item as SummaryItemType)} className={itemClassName} />)
    .with("profiles", () => <ProfilesItem {...(item as SectionItem<"profiles">)} className={itemClassName} />)
    .with("experience", () => (
      <ExperienceItem
        {...(item as SectionItem<"experience">)}
        className={itemClassName}
        headerLayout={itemProps?.headerLayout}
      />
    ))
    .with("education", () => (
      <EducationItem
        {...(item as SectionItem<"education">)}
        className={itemClassName}
        headerLayout={itemProps?.headerLayout}
      />
    ))
    .with("projects", () => <ProjectsItem {...(item as SectionItem<"projects">)} className={itemClassName} />)
    .with("skills", () => <SkillsItem {...(item as SectionItem<"skills">)} className={itemClassName} />)
    .with("languages", () => <LanguagesItem {...(item as SectionItem<"languages">)} className={itemClassName} />)
    .with("interests", () => <InterestsItem {...(item as SectionItem<"interests">)} className={itemClassName} />)
    .with("awards", () => <AwardsItem {...(item as SectionItem<"awards">)} className={itemClassName} />)
    .with("certifications", () => (
      <CertificationsItem {...(item as SectionItem<"certifications">)} className={itemClassName} />
    ))
    .with("publications", () => (
      <PublicationsItem {...(item as SectionItem<"publications">)} className={itemClassName} />
    ))
    .with("volunteer", () => (
      <VolunteerItem
        {...(item as SectionItem<"volunteer">)}
        className={itemClassName}
        headerLayout={itemProps?.headerLayout}
      />
    ))
    .with("references", () => <ReferencesItem {...(item as SectionItem<"references">)} className={itemClassName} />)
    .with("cover-letter", () => <CoverLetterItem {...(item as CoverLetterItemType)} className={itemClassName} />)
    .exhaustive();
}

type SectionProps = { id: string };

export function getSectionComponent(
  section: "summary" | SectionType | (string & {}),
  { sectionClassName, itemClassName, itemProps }: SectionComponentProps = {},
) {
  return match(section)
    .with("summary", () => {
      const SummarySection = (_: SectionProps) => <PageSummary className={sectionClassName} />;

      return SummarySection;
    })
    .with("profiles", () => {
      const ProfilesSection = (_: SectionProps) => (
        <PageSection type="profiles" className={sectionClassName}>
          {(item) => <ProfilesItem {...item} className={itemClassName} />}
        </PageSection>
      );

      return ProfilesSection;
    })
    .with("experience", () => {
      const ExperienceSection = (_: SectionProps) => (
        <PageSection type="experience" className={sectionClassName}>
          {(item) => <ExperienceItem {...item} className={itemClassName} headerLayout={itemProps?.headerLayout} />}
        </PageSection>
      );

      return ExperienceSection;
    })
    .with("education", () => {
      const EducationSection = (_: SectionProps) => (
        <PageSection type="education" className={sectionClassName}>
          {(item) => <EducationItem {...item} className={itemClassName} headerLayout={itemProps?.headerLayout} />}
        </PageSection>
      );

      return EducationSection;
    })
    .with("projects", () => {
      const ProjectsSection = (_: SectionProps) => (
        <PageSection type="projects" className={sectionClassName}>
          {(item) => <ProjectsItem {...item} className={itemClassName} />}
        </PageSection>
      );

      return ProjectsSection;
    })
    .with("skills", () => {
      const SkillsSection = (_: SectionProps) => (
        <PageSection type="skills" className={sectionClassName}>
          {(item) => <SkillsItem {...item} className={itemClassName} />}
        </PageSection>
      );

      return SkillsSection;
    })
    .with("languages", () => {
      const LanguagesSection = (_: SectionProps) => (
        <PageSection type="languages" className={sectionClassName}>
          {(item) => <LanguagesItem {...item} className={itemClassName} />}
        </PageSection>
      );

      return LanguagesSection;
    })
    .with("interests", () => {
      const InterestsSection = (_: SectionProps) => (
        <PageSection type="interests" className={sectionClassName}>
          {(item) => <InterestsItem {...item} className={itemClassName} />}
        </PageSection>
      );

      return InterestsSection;
    })
    .with("awards", () => {
      const AwardsSection = (_: SectionProps) => (
        <PageSection type="awards" className={sectionClassName}>
          {(item) => <AwardsItem {...item} className={itemClassName} />}
        </PageSection>
      );

      return AwardsSection;
    })
    .with("certifications", () => {
      const CertificationsSection = (_: SectionProps) => (
        <PageSection type="certifications" className={sectionClassName}>
          {(item) => <CertificationsItem {...item} className={itemClassName} />}
        </PageSection>
      );

      return CertificationsSection;
    })
    .with("publications", () => {
      const PublicationsSection = (_: SectionProps) => (
        <PageSection type="publications" className={sectionClassName}>
          {(item) => <PublicationsItem {...item} className={itemClassName} />}
        </PageSection>
      );

      return PublicationsSection;
    })
    .with("volunteer", () => {
      const VolunteerSection = (_: SectionProps) => (
        <PageSection type="volunteer" className={sectionClassName}>
          {(item) => <VolunteerItem {...item} className={itemClassName} headerLayout={itemProps?.headerLayout} />}
        </PageSection>
      );

      return VolunteerSection;
    })
    .with("references", () => {
      const ReferencesSection = (_: SectionProps) => (
        <PageSection type="references" className={sectionClassName}>
          {(item) => <ReferencesItem {...item} className={itemClassName} />}
        </PageSection>
      );

      return ReferencesSection;
    })
    .otherwise(() => {
      // Custom section - render based on its type
      const CustomSectionComponent = ({ id }: SectionProps) => {
        const customSection = useResumeStore((state) => state.resume.data.customSections.find((s) => s.id === id));

        if (!customSection) return null;
        if (customSection.hidden) return null;
        if (customSection.items.length === 0) return null;

        const visibleItems = customSection.items.filter((item) => !item.hidden);
        if (visibleItems.length === 0) return null;

        return (
          <section className={cn(`page-section page-section-custom page-section-${id}`, sectionClassName)}>
            {customSection.type !== "cover-letter" && (
              <h6 className="mb-1.5 text-(--page-primary-color)">{customSection.title}</h6>
            )}

            <div
              className="section-content grid gap-x-(--page-gap-x) gap-y-(--page-gap-y)"
              style={{ gridTemplateColumns: `repeat(${customSection.columns}, 1fr)` }}
            >
              {visibleItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(`section-item section-item-${customSection.type} print:break-inside-avoid`)}
                >
                  {renderItemByType(customSection.type, item, itemClassName, itemProps)}
                </div>
              ))}
            </div>
          </section>
        );
      };

      return CustomSectionComponent;
    });
}
