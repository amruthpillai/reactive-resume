import { match } from "ts-pattern";
import { Dialog } from "@/components/ui/dialog";
import { CreateApiKeyDialog } from "./api-key/create";
import { ChangePasswordDialog } from "./auth/change-password";
import { DisableTwoFactorDialog } from "./auth/disable-two-factor";
import { EnableTwoFactorDialog } from "./auth/enable-two-factor";
import { CreateResumeDialog, DuplicateResumeDialog, UpdateResumeDialog } from "./resume";
import { ImportResumeDialog } from "./resume/import";
import { CreateAwardDialog, UpdateAwardDialog } from "./resume/sections/award";
import { CreateCertificationDialog, UpdateCertificationDialog } from "./resume/sections/certification";
import { CreateCustomSectionDialog, UpdateCustomSectionDialog } from "./resume/sections/custom";
import { CreateEducationDialog, UpdateEducationDialog } from "./resume/sections/education";
import { CreateExperienceDialog, UpdateExperienceDialog } from "./resume/sections/experience";
import { CreateInterestDialog, UpdateInterestDialog } from "./resume/sections/interest";
import { CreateLanguageDialog, UpdateLanguageDialog } from "./resume/sections/language";
import { CreateProfileDialog, UpdateProfileDialog } from "./resume/sections/profile";
import { CreateProjectDialog, UpdateProjectDialog } from "./resume/sections/project";
import { CreatePublicationDialog, UpdatePublicationDialog } from "./resume/sections/publication";
import { CreateReferenceDialog, UpdateReferenceDialog } from "./resume/sections/reference";
import { CreateSkillDialog, UpdateSkillDialog } from "./resume/sections/skill";
import { CreateVolunteerDialog, UpdateVolunteerDialog } from "./resume/sections/volunteer";
import { TemplateGalleryDialog } from "./resume/template/gallery";
import { useDialogStore } from "./store";

export function DialogManager() {
	const { open, activeDialog, onOpenChange } = useDialogStore();

	const dialogContent = match(activeDialog)
		.with({ type: "auth.change-password" }, () => <ChangePasswordDialog />)
		.with({ type: "auth.two-factor.enable" }, () => <EnableTwoFactorDialog />)
		.with({ type: "auth.two-factor.disable" }, () => <DisableTwoFactorDialog />)
		.with({ type: "api-key.create" }, () => <CreateApiKeyDialog />)
		.with({ type: "resume.create" }, () => <CreateResumeDialog />)
		.with({ type: "resume.update" }, ({ data }) => <UpdateResumeDialog data={data} />)
		.with({ type: "resume.duplicate" }, ({ data }) => <DuplicateResumeDialog data={data} />)
		.with({ type: "resume.import" }, () => <ImportResumeDialog />)
		.with({ type: "resume.template.gallery" }, () => <TemplateGalleryDialog />)
		.with({ type: "resume.sections.profiles.create" }, ({ data }) => <CreateProfileDialog data={data} />)
		.with({ type: "resume.sections.profiles.update" }, ({ data }) => <UpdateProfileDialog data={data} />)
		.with({ type: "resume.sections.experience.create" }, ({ data }) => <CreateExperienceDialog data={data} />)
		.with({ type: "resume.sections.experience.update" }, ({ data }) => <UpdateExperienceDialog data={data} />)
		.with({ type: "resume.sections.education.create" }, ({ data }) => <CreateEducationDialog data={data} />)
		.with({ type: "resume.sections.education.update" }, ({ data }) => <UpdateEducationDialog data={data} />)
		.with({ type: "resume.sections.skills.create" }, ({ data }) => <CreateSkillDialog data={data} />)
		.with({ type: "resume.sections.skills.update" }, ({ data }) => <UpdateSkillDialog data={data} />)
		.with({ type: "resume.sections.projects.create" }, ({ data }) => <CreateProjectDialog data={data} />)
		.with({ type: "resume.sections.projects.update" }, ({ data }) => <UpdateProjectDialog data={data} />)
		.with({ type: "resume.sections.certifications.create" }, ({ data }) => <CreateCertificationDialog data={data} />)
		.with({ type: "resume.sections.certifications.update" }, ({ data }) => <UpdateCertificationDialog data={data} />)
		.with({ type: "resume.sections.languages.create" }, ({ data }) => <CreateLanguageDialog data={data} />)
		.with({ type: "resume.sections.languages.update" }, ({ data }) => <UpdateLanguageDialog data={data} />)
		.with({ type: "resume.sections.publications.create" }, ({ data }) => <CreatePublicationDialog data={data} />)
		.with({ type: "resume.sections.publications.update" }, ({ data }) => <UpdatePublicationDialog data={data} />)
		.with({ type: "resume.sections.awards.create" }, ({ data }) => <CreateAwardDialog data={data} />)
		.with({ type: "resume.sections.awards.update" }, ({ data }) => <UpdateAwardDialog data={data} />)
		.with({ type: "resume.sections.interests.create" }, ({ data }) => <CreateInterestDialog data={data} />)
		.with({ type: "resume.sections.interests.update" }, ({ data }) => <UpdateInterestDialog data={data} />)
		.with({ type: "resume.sections.volunteer.create" }, ({ data }) => <CreateVolunteerDialog data={data} />)
		.with({ type: "resume.sections.volunteer.update" }, ({ data }) => <UpdateVolunteerDialog data={data} />)
		.with({ type: "resume.sections.references.create" }, ({ data }) => <CreateReferenceDialog data={data} />)
		.with({ type: "resume.sections.references.update" }, ({ data }) => <UpdateReferenceDialog data={data} />)
		.with({ type: "resume.sections.custom.create" }, ({ data }) => <CreateCustomSectionDialog data={data} />)
		.with({ type: "resume.sections.custom.update" }, ({ data }) => <UpdateCustomSectionDialog data={data} />)
		.otherwise(() => null);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{dialogContent}
		</Dialog>
	);
}
