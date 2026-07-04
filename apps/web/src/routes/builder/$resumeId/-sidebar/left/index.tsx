import type { LeftSidebarSection } from "@/libs/resume/section";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { LockSimpleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { Fragment, useCallback, useRef } from "react";
import { toast } from "sonner";
import { match } from "ts-pattern";
import { Avatar, AvatarFallback, AvatarImage } from "@reactive-resume/ui/components/avatar";
import { Button } from "@reactive-resume/ui/components/button";
import { ScrollArea } from "@reactive-resume/ui/components/scroll-area";
import { Separator } from "@reactive-resume/ui/components/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@reactive-resume/ui/components/tooltip";
import { getInitials } from "@reactive-resume/utils/string";
import { useCurrentResume, useIsResumeLocked, usePatchResume } from "@/features/resume/builder/draft";
import { UserDropdownMenu } from "@/features/user/dropdown-menu";
import { getResumeErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";
import { getSectionIcon, getSectionTitle, leftSidebarSections } from "@/libs/resume/section";
import { BuilderSidebarEdge } from "../../-components/edge";
import { useBuilderSidebar } from "../../-store/sidebar";
import { AwardsSectionBuilder } from "./sections/awards";
import { BasicsSectionBuilder } from "./sections/basics";
import { CertificationsSectionBuilder } from "./sections/certifications";
import { CustomSectionBuilder } from "./sections/custom";
import { EducationSectionBuilder } from "./sections/education";
import { ExperienceSectionBuilder } from "./sections/experience";
import { InterestsSectionBuilder } from "./sections/interests";
import { LanguagesSectionBuilder } from "./sections/languages";
import { PictureSectionBuilder } from "./sections/picture";
import { ProfilesSectionBuilder } from "./sections/profiles";
import { ProjectsSectionBuilder } from "./sections/projects";
import { PublicationsSectionBuilder } from "./sections/publications";
import { ReferencesSectionBuilder } from "./sections/references";
import { SkillsSectionBuilder } from "./sections/skills";
import { SummarySectionBuilder } from "./sections/summary";
import { VolunteerSectionBuilder } from "./sections/volunteer";

function getSectionComponent(type: LeftSidebarSection) {
	return match(type)
		.with("picture", () => <PictureSectionBuilder />)
		.with("basics", () => <BasicsSectionBuilder />)
		.with("summary", () => <SummarySectionBuilder />)
		.with("profiles", () => <ProfilesSectionBuilder />)
		.with("experience", () => <ExperienceSectionBuilder />)
		.with("education", () => <EducationSectionBuilder />)
		.with("projects", () => <ProjectsSectionBuilder />)
		.with("skills", () => <SkillsSectionBuilder />)
		.with("languages", () => <LanguagesSectionBuilder />)
		.with("interests", () => <InterestsSectionBuilder />)
		.with("awards", () => <AwardsSectionBuilder />)
		.with("certifications", () => <CertificationsSectionBuilder />)
		.with("publications", () => <PublicationsSectionBuilder />)
		.with("volunteer", () => <VolunteerSectionBuilder />)
		.with("references", () => <ReferencesSectionBuilder />)
		.with("custom", () => <CustomSectionBuilder />)
		.exhaustive();
}

export function BuilderSidebarLeft() {
	const scrollAreaRef = useRef<HTMLDivElement | null>(null);
	const isLocked = useIsResumeLocked();

	return (
		<>
			<SidebarEdge />

			<ScrollArea ref={scrollAreaRef} className="@container h-[calc(100svh-3.5rem)] bg-background sm:ms-12">
				<div className="space-y-4 p-4">
					{isLocked && <LockBanner />}

					<fieldset disabled={isLocked} className="m-0 min-w-0 space-y-4 border-0 p-0">
						{leftSidebarSections.map((section) => (
							<Fragment key={section}>
								{getSectionComponent(section)}
								<Separator />
							</Fragment>
						))}
					</fieldset>
				</div>
			</ScrollArea>
		</>
	);
}

function LockBanner() {
	const resume = useCurrentResume();
	const patchResume = usePatchResume();
	const { mutate: setLocked, isPending } = useMutation(orpc.resume.setLocked.mutationOptions());

	const handleUnlock = () => {
		setLocked(
			{ id: resume.id, isLocked: false },
			{
				onSuccess: () => {
					patchResume((draft) => {
						draft.isLocked = false;
					});
				},
				onError: (error) => {
					toast.error(getResumeErrorMessage(error));
				},
			},
		);
	};

	return (
		<div className="flex items-center gap-x-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
			<LockSimpleIcon className="size-5 shrink-0 text-amber-600 dark:text-amber-500" />
			<div className="min-w-0 flex-1">
				<p className="font-medium text-sm">
					<Trans>This resume is locked</Trans>
				</p>
				<p className="text-muted-foreground text-xs">
					<Trans>Editing is disabled until you unlock it.</Trans>
				</p>
			</div>
			<Button size="sm" variant="secondary" disabled={isPending} onClick={handleUnlock}>
				<Trans>Enable editing</Trans>
			</Button>
		</div>
	);
}

function SidebarEdge() {
	const toggleSidebar = useBuilderSidebar((state) => state.toggleSidebar);

	const scrollToSection = useCallback(
		(section: LeftSidebarSection) => {
			toggleSidebar("left", true);
			// Section ids are globally unique; document.getElementById reliably resolves the scroll target
			// (querying through the ScrollArea ref did not — its ref does not expose the scroll container).
			document
				.getElementById(`sidebar-${section}`)
				?.scrollIntoView({ block: "start", inline: "nearest", behavior: "smooth" });
		},
		[toggleSidebar],
	);

	return (
		<BuilderSidebarEdge side="left">
			<div className="flex min-h-0 w-full flex-1 flex-col items-center gap-y-2 overflow-hidden">
				<div className="no-scrollbar min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden">
					<div className="flex min-h-full flex-col items-center justify-center gap-y-2">
						{leftSidebarSections.map((section) => (
							<Tooltip key={section}>
								<TooltipTrigger
									render={
										<Button
											size="icon"
											variant="ghost"
											aria-label={getSectionTitle(section)}
											onClick={() => scrollToSection(section)}
										>
											{getSectionIcon(section)}
										</Button>
									}
								/>
								<TooltipContent side="right" className="font-medium">
									{getSectionTitle(section)}
								</TooltipContent>
							</Tooltip>
						))}
					</div>
				</div>

				<UserDropdownMenu>
					{({ session }) => (
						<Button size="icon" variant="ghost" aria-label={t`Account menu`}>
							<Avatar className="size-6">
								<AvatarImage src={session.user.image ?? undefined} />
								<AvatarFallback className="text-[0.5rem]">{getInitials(session.user.name)}</AvatarFallback>
							</Avatar>
						</Button>
					)}
				</UserDropdownMenu>
			</div>
		</BuilderSidebarEdge>
	);
}
