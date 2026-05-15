import { defineDialogRenderer, defineDialogRendererRegistry } from "../renderer-registry";
import { CreateResumeDialog, DuplicateResumeDialog, UpdateResumeDialog } from ".";
import { ImportResumeDialog } from "./import";
import { CreateAwardDialog, UpdateAwardDialog } from "./sections/award";
import { CreateCertificationDialog, UpdateCertificationDialog } from "./sections/certification";
import { CreateCoverLetterDialog, UpdateCoverLetterDialog } from "./sections/cover-letter";
import { CreateCustomSectionDialog, UpdateCustomSectionDialog } from "./sections/custom";
import { CreateEducationDialog, UpdateEducationDialog } from "./sections/education";
import { CreateExperienceDialog, UpdateExperienceDialog } from "./sections/experience";
import { CreateInterestDialog, UpdateInterestDialog } from "./sections/interest";
import { CreateLanguageDialog, UpdateLanguageDialog } from "./sections/language";
import { CreateProfileDialog, UpdateProfileDialog } from "./sections/profile";
import { CreateProjectDialog, UpdateProjectDialog } from "./sections/project";
import { CreatePublicationDialog, UpdatePublicationDialog } from "./sections/publication";
import { CreateReferenceDialog, UpdateReferenceDialog } from "./sections/reference";
import { CreateSkillDialog, UpdateSkillDialog } from "./sections/skill";
import { CreateSummaryItemDialog, UpdateSummaryItemDialog } from "./sections/summary-item";
import { CreateVolunteerDialog, UpdateVolunteerDialog } from "./sections/volunteer";
import { TemplateGalleryDialog } from "./template/gallery";

export const resumeDialogRendererRegistry = defineDialogRendererRegistry("resume", [
	defineDialogRenderer("resume.create", () => <CreateResumeDialog />),
	defineDialogRenderer("resume.update", ({ data }) => <UpdateResumeDialog data={data} />),
	defineDialogRenderer("resume.duplicate", ({ data }) => <DuplicateResumeDialog data={data} />),
	defineDialogRenderer("resume.import", () => <ImportResumeDialog />),
	defineDialogRenderer("resume.template.gallery", () => <TemplateGalleryDialog />),
	defineDialogRenderer("resume.sections.profiles.create", ({ data }) => <CreateProfileDialog data={data} />),
	defineDialogRenderer("resume.sections.profiles.update", ({ data }) => <UpdateProfileDialog data={data} />),
	defineDialogRenderer("resume.sections.experience.create", ({ data }) => <CreateExperienceDialog data={data} />),
	defineDialogRenderer("resume.sections.experience.update", ({ data }) => <UpdateExperienceDialog data={data} />),
	defineDialogRenderer("resume.sections.education.create", ({ data }) => <CreateEducationDialog data={data} />),
	defineDialogRenderer("resume.sections.education.update", ({ data }) => <UpdateEducationDialog data={data} />),
	defineDialogRenderer("resume.sections.skills.create", ({ data }) => <CreateSkillDialog data={data} />),
	defineDialogRenderer("resume.sections.skills.update", ({ data }) => <UpdateSkillDialog data={data} />),
	defineDialogRenderer("resume.sections.projects.create", ({ data }) => <CreateProjectDialog data={data} />),
	defineDialogRenderer("resume.sections.projects.update", ({ data }) => <UpdateProjectDialog data={data} />),
	defineDialogRenderer("resume.sections.certifications.create", ({ data }) => (
		<CreateCertificationDialog data={data} />
	)),
	defineDialogRenderer("resume.sections.certifications.update", ({ data }) => (
		<UpdateCertificationDialog data={data} />
	)),
	defineDialogRenderer("resume.sections.languages.create", ({ data }) => <CreateLanguageDialog data={data} />),
	defineDialogRenderer("resume.sections.languages.update", ({ data }) => <UpdateLanguageDialog data={data} />),
	defineDialogRenderer("resume.sections.publications.create", ({ data }) => <CreatePublicationDialog data={data} />),
	defineDialogRenderer("resume.sections.publications.update", ({ data }) => <UpdatePublicationDialog data={data} />),
	defineDialogRenderer("resume.sections.awards.create", ({ data }) => <CreateAwardDialog data={data} />),
	defineDialogRenderer("resume.sections.awards.update", ({ data }) => <UpdateAwardDialog data={data} />),
	defineDialogRenderer("resume.sections.interests.create", ({ data }) => <CreateInterestDialog data={data} />),
	defineDialogRenderer("resume.sections.interests.update", ({ data }) => <UpdateInterestDialog data={data} />),
	defineDialogRenderer("resume.sections.volunteer.create", ({ data }) => <CreateVolunteerDialog data={data} />),
	defineDialogRenderer("resume.sections.volunteer.update", ({ data }) => <UpdateVolunteerDialog data={data} />),
	defineDialogRenderer("resume.sections.references.create", ({ data }) => <CreateReferenceDialog data={data} />),
	defineDialogRenderer("resume.sections.references.update", ({ data }) => <UpdateReferenceDialog data={data} />),
	defineDialogRenderer("resume.sections.summary.create", ({ data }) => <CreateSummaryItemDialog data={data} />),
	defineDialogRenderer("resume.sections.summary.update", ({ data }) => <UpdateSummaryItemDialog data={data} />),
	defineDialogRenderer("resume.sections.cover-letter.create", ({ data }) => <CreateCoverLetterDialog data={data} />),
	defineDialogRenderer("resume.sections.cover-letter.update", ({ data }) => <UpdateCoverLetterDialog data={data} />),
	defineDialogRenderer("resume.sections.custom.create", ({ data }) => <CreateCustomSectionDialog data={data} />),
	defineDialogRenderer("resume.sections.custom.update", ({ data }) => <UpdateCustomSectionDialog data={data} />),
]);
