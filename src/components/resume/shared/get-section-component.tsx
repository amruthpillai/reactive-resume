import { match } from "ts-pattern";
import type { CustomSectionItem, SectionType } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { useResumeStore } from "../store/resume";
import { AwardsItem } from "./items/awards-item";
import { CertificationsItem } from "./items/certifications-item";
import { EducationItem } from "./items/education-item";
import { ExperienceItem } from "./items/experience-item";
import { InterestsItem } from "./items/interests-item";
import { LanguagesItem } from "./items/languages-item";
import { ProfilesItem } from "./items/profiles-item";
import { ProjectsItem } from "./items/projects-item";
import { PublicationsItem } from "./items/publications-item";
import { ReferencesItem } from "./items/references-item";
import { SkillsItem } from "./items/skills-item";
import { VolunteerItem } from "./items/volunteer-item";
import { PageSection } from "./page-section";
import { PageSummary } from "./page-summary";

type SectionComponentProps = {
	sectionClassName?: string;
	itemClassName?: string;
};

// Helper to render item component based on type
function renderItemByType(type: SectionType, item: CustomSectionItem, itemClassName?: string) {
	return match(type)
		.with("profiles", () => (
			<ProfilesItem {...(item as Parameters<typeof ProfilesItem>[0])} className={itemClassName} />
		))
		.with("experience", () => (
			<ExperienceItem {...(item as Parameters<typeof ExperienceItem>[0])} className={itemClassName} />
		))
		.with("education", () => (
			<EducationItem {...(item as Parameters<typeof EducationItem>[0])} className={itemClassName} />
		))
		.with("projects", () => (
			<ProjectsItem {...(item as Parameters<typeof ProjectsItem>[0])} className={itemClassName} />
		))
		.with("skills", () => <SkillsItem {...(item as Parameters<typeof SkillsItem>[0])} className={itemClassName} />)
		.with("languages", () => (
			<LanguagesItem {...(item as Parameters<typeof LanguagesItem>[0])} className={itemClassName} />
		))
		.with("interests", () => (
			<InterestsItem {...(item as Parameters<typeof InterestsItem>[0])} className={itemClassName} />
		))
		.with("awards", () => <AwardsItem {...(item as Parameters<typeof AwardsItem>[0])} className={itemClassName} />)
		.with("certifications", () => (
			<CertificationsItem {...(item as Parameters<typeof CertificationsItem>[0])} className={itemClassName} />
		))
		.with("publications", () => (
			<PublicationsItem {...(item as Parameters<typeof PublicationsItem>[0])} className={itemClassName} />
		))
		.with("volunteer", () => (
			<VolunteerItem {...(item as Parameters<typeof VolunteerItem>[0])} className={itemClassName} />
		))
		.with("references", () => (
			<ReferencesItem {...(item as Parameters<typeof ReferencesItem>[0])} className={itemClassName} />
		))
		.exhaustive();
}

export function getSectionComponent(
	section: "summary" | SectionType | (string & {}),
	{ sectionClassName, itemClassName }: SectionComponentProps = {},
) {
	return match(section)
		.with("summary", () => {
			const SummarySection = ({ id: _id }: { id: string }) => <PageSummary className={sectionClassName} />;
			return SummarySection;
		})
		.with("profiles", () => {
			const ProfilesSection = ({ id: _id }: { id: string }) => (
				<PageSection type="profiles" className={sectionClassName}>
					{(item) => <ProfilesItem {...item} className={itemClassName} />}
				</PageSection>
			);
			return ProfilesSection;
		})
		.with("experience", () => {
			const ExperienceSection = ({ id: _id }: { id: string }) => (
				<PageSection type="experience" className={sectionClassName}>
					{(item) => <ExperienceItem {...item} className={itemClassName} />}
				</PageSection>
			);
			return ExperienceSection;
		})
		.with("education", () => {
			const EducationSection = ({ id: _id }: { id: string }) => (
				<PageSection type="education" className={sectionClassName}>
					{(item) => <EducationItem {...item} className={itemClassName} />}
				</PageSection>
			);
			return EducationSection;
		})
		.with("projects", () => {
			const ProjectsSection = ({ id: _id }: { id: string }) => (
				<PageSection type="projects" className={sectionClassName}>
					{(item) => <ProjectsItem {...item} className={itemClassName} />}
				</PageSection>
			);
			return ProjectsSection;
		})
		.with("skills", () => {
			const SkillsSection = ({ id: _id }: { id: string }) => (
				<PageSection type="skills" className={sectionClassName}>
					{(item) => <SkillsItem {...item} className={itemClassName} />}
				</PageSection>
			);
			return SkillsSection;
		})
		.with("languages", () => {
			const LanguagesSection = ({ id: _id }: { id: string }) => (
				<PageSection type="languages" className={sectionClassName}>
					{(item) => <LanguagesItem {...item} className={itemClassName} />}
				</PageSection>
			);
			return LanguagesSection;
		})
		.with("interests", () => {
			const InterestsSection = ({ id: _id }: { id: string }) => (
				<PageSection type="interests" className={sectionClassName}>
					{(item) => <InterestsItem {...item} className={itemClassName} />}
				</PageSection>
			);
			return InterestsSection;
		})
		.with("awards", () => {
			const AwardsSection = ({ id: _id }: { id: string }) => (
				<PageSection type="awards" className={sectionClassName}>
					{(item) => <AwardsItem {...item} className={itemClassName} />}
				</PageSection>
			);
			return AwardsSection;
		})
		.with("certifications", () => {
			const CertificationsSection = ({ id: _id }: { id: string }) => (
				<PageSection type="certifications" className={sectionClassName}>
					{(item) => <CertificationsItem {...item} className={itemClassName} />}
				</PageSection>
			);
			return CertificationsSection;
		})
		.with("publications", () => {
			const PublicationsSection = ({ id: _id }: { id: string }) => (
				<PageSection type="publications" className={sectionClassName}>
					{(item) => <PublicationsItem {...item} className={itemClassName} />}
				</PageSection>
			);
			return PublicationsSection;
		})
		.with("volunteer", () => {
			const VolunteerSection = ({ id: _id }: { id: string }) => (
				<PageSection type="volunteer" className={sectionClassName}>
					{(item) => <VolunteerItem {...item} className={itemClassName} />}
				</PageSection>
			);
			return VolunteerSection;
		})
		.with("references", () => {
			const ReferencesSection = ({ id: _id }: { id: string }) => (
				<PageSection type="references" className={sectionClassName}>
					{(item) => <ReferencesItem {...item} className={itemClassName} />}
				</PageSection>
			);
			return ReferencesSection;
		})
		.otherwise(() => {
			// Custom section - render based on its type
			const CustomSectionComponent = ({ id }: { id: string }) => {
				const customSection = useResumeStore((state) => state.resume.data.customSections.find((s) => s.id === id));

				if (!customSection) return null;
				if (customSection.hidden) return null;
				if (customSection.items.length === 0) return null;

				const visibleItems = customSection.items.filter((item) => !item.hidden);
				if (visibleItems.length === 0) return null;

				return (
					<section className={cn(`page-section page-section-custom page-section-${id}`, sectionClassName)}>
						<h6 className="mb-1 text-(--page-primary-color)">{customSection.title}</h6>

						<div
							className="section-content grid gap-x-(--page-gap-x) gap-y-(--page-gap-y)"
							style={{ gridTemplateColumns: `repeat(${customSection.columns}, 1fr)` }}
						>
							{visibleItems.map((item) => (
								<div key={item.id} className={cn(`section-item section-item-${customSection.type}`)}>
									{renderItemByType(customSection.type, item, itemClassName)}
								</div>
							))}
						</div>
					</section>
				);
			};
			return CustomSectionComponent;
		});
}
