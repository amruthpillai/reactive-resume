import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ReadCvLogoIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useAIStore } from "@/integrations/ai/store";
import { client, orpc } from "@/integrations/orpc/client";
import type { JobResult } from "@/schema/jobs";
import type { NewSkillInfo } from "@/schema/tailor";
import { buildSkillSyncOperations, tailorOutputToPatches, validateTailorOutput } from "@/utils/resume/tailor";
import { slugify } from "@/utils/string";

type Props = {
	job: JobResult;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type DialogPhase =
	| { step: "select" }
	| { step: "tailoring" }
	| { step: "skill-sync"; newResumeId: string; newSkills: NewSkillInfo[]; sourceResumeId: string };

export function TailorDialog({ job, open, onOpenChange }: Props) {
	const navigate = useNavigate();
	const { data: resumes, isLoading } = useQuery(orpc.resume.list.queryOptions());

	const [phase, setPhase] = useState<DialogPhase>({ step: "select" });
	const [selectedSkills, setSelectedSkills] = useState<Set<number>>(new Set());

	const aiEnabled = useAIStore((s) => s.enabled);
	const aiProvider = useAIStore((s) => s.provider);
	const aiModel = useAIStore((s) => s.model);
	const aiApiKey = useAIStore((s) => s.apiKey);
	const aiBaseURL = useAIStore((s) => s.baseURL);

	const { mutate: duplicateResume, isPending: isDuplicating } = useMutation(orpc.resume.duplicate.mutationOptions());

	const resetDialog = () => {
		setPhase({ step: "select" });
		setSelectedSkills(new Set());
	};

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) resetDialog();
		onOpenChange(nextOpen);
	};

	const navigateToBuilder = (resumeId: string) => {
		if (job.job_apply_link) {
			window.open(job.job_apply_link, "_blank", "noopener,noreferrer");
		}
		handleOpenChange(false);
		void navigate({ to: "/builder/$resumeId", params: { resumeId } });
	};

	const handleSelectResume = async (resumeId: string, resumeName: string) => {
		const tailorName = `${resumeName} - ${job.job_title}`;
		const tailorSlug = slugify(`${tailorName}-${Date.now()}`);

		// If AI is not enabled, fall back to duplicating and navigating to builder
		if (!aiEnabled) {
			duplicateResume(
				{ id: resumeId, name: tailorName, slug: tailorSlug, tags: ["tailored"] },
				{
					onSuccess: (newResumeId) => navigateToBuilder(newResumeId),
					onError: (error) => {
						toast.error(t`Failed to duplicate resume`, { description: error.message });
					},
				},
			);
			return;
		}

		// AI-powered tailoring pipeline
		setPhase({ step: "tailoring" });

		try {
			// Step 1: Duplicate the resume
			const newResumeId = await client.resume.duplicate({
				id: resumeId,
				name: tailorName,
				slug: tailorSlug,
				tags: ["tailored"],
			});

			// Step 2: Fetch the full resume data
			const resume = await client.resume.getById({ id: newResumeId });

			// Step 3: Call AI tailor endpoint
			const tailorOutput = await client.ai.tailorResume({
				provider: aiProvider,
				model: aiModel,
				apiKey: aiApiKey,
				baseURL: aiBaseURL,
				resumeData: resume.data,
				job,
			});

			// Step 4: Validate AI output
			const errors = validateTailorOutput(tailorOutput, resume.data);
			if (errors.length > 0) {
				toast.error(t`AI returned some invalid references`, {
					description: errors.join("; "),
				});
			}

			// Step 5: Convert to patches and apply
			const { operations, newSkills } = tailorOutputToPatches(tailorOutput, resume.data);

			if (operations.length > 0) {
				await client.resume.patch({ id: newResumeId, operations });
			}

			// Step 6: If new skills were found, show sync dialog
			if (newSkills.length > 0) {
				setSelectedSkills(new Set(newSkills.map((_, i) => i)));
				setPhase({
					step: "skill-sync",
					newResumeId,
					newSkills,
					sourceResumeId: resumeId,
				});
			} else {
				toast.success(t`Resume tailored successfully`);
				navigateToBuilder(newResumeId);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			toast.error(t`Tailoring failed`, { description: message });
			setPhase({ step: "select" });
		}
	};

	const handleSkillSync = async () => {
		if (phase.step !== "skill-sync") return;

		const { newResumeId, newSkills, sourceResumeId } = phase;
		const skillsToSync = Array.from(selectedSkills).map((i) => newSkills[i]);

		if (skillsToSync.length > 0) {
			try {
				const operations = buildSkillSyncOperations(skillsToSync);
				await client.resume.patch({ id: sourceResumeId, operations });
				toast.success(t`Added ${skillsToSync.length} new skills to your original resume`);
			} catch (error) {
				const message = error instanceof Error ? error.message : "Unknown error";
				toast.error(t`Failed to sync skills`, { description: message });
			}
		}

		toast.success(t`Resume tailored successfully`);
		navigateToBuilder(newResumeId);
	};

	const handleSkipSync = () => {
		if (phase.step !== "skill-sync") return;
		toast.success(t`Resume tailored successfully`);
		navigateToBuilder(phase.newResumeId);
	};

	const toggleSkill = (index: number) => {
		setSelectedSkills((prev) => {
			const next = new Set(prev);
			if (next.has(index)) {
				next.delete(index);
			} else {
				next.add(index);
			}
			return next;
		});
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent>
				{phase.step === "select" && (
					<>
						<DialogHeader>
							<DialogTitle>
								<Trans>Tailor Resume</Trans>
							</DialogTitle>
							<DialogDescription>
								<Trans>
									Select a resume to tailor for "{job.job_title}" at {job.employer_name}. A copy will be created
									{aiEnabled ? " and the AI will optimize it for this position." : "."}
								</Trans>
							</DialogDescription>
						</DialogHeader>

						<ScrollArea className="max-h-80">
							{isLoading ? (
								<div className="flex items-center justify-center py-8">
									<Spinner />
								</div>
							) : resumes && resumes.length > 0 ? (
								<div className="flex flex-col gap-y-1">
									{resumes.map((resume) => (
										<Button
											key={resume.id}
											variant="ghost"
											className="h-auto w-full justify-start gap-x-3 py-3"
											disabled={isDuplicating}
											onClick={() => handleSelectResume(resume.id, resume.name)}
										>
											<ReadCvLogoIcon className="size-5 shrink-0" />
											<div className="min-w-0 text-start">
												<p className="truncate font-medium">{resume.name}</p>
												<p className="truncate text-muted-foreground text-xs">
													{new Date(resume.updatedAt).toLocaleDateString()}
												</p>
												{resume.tags.length > 0 && (
													<div className="mt-1 flex flex-wrap gap-1">
														{resume.tags.map((tag) => (
															<Badge key={tag} variant="secondary" className="text-[10px]">
																{tag}
															</Badge>
														))}
													</div>
												)}
											</div>
											{isDuplicating && <Spinner className="ms-auto" />}
										</Button>
									))}
								</div>
							) : (
								<div className="py-8 text-center">
									<p className="text-muted-foreground text-sm">
										<Trans>No resumes found. Create a resume first.</Trans>
									</p>
								</div>
							)}
						</ScrollArea>

						<DialogFooter>
							<DialogClose render={<Button variant="outline" />}>
								<Trans>Cancel</Trans>
							</DialogClose>
						</DialogFooter>
					</>
				)}

				{phase.step === "tailoring" && (
					<div className="flex flex-col items-center gap-y-4 py-12">
						<Spinner className="size-10" />
						<div className="text-center">
							<p className="font-medium">
								<Trans>Tailoring your resume...</Trans>
							</p>
							<p className="mt-1 text-muted-foreground text-sm">
								<Trans>Optimizing summary, experience, and skills for {job.job_title}</Trans>
							</p>
						</div>
					</div>
				)}

				{phase.step === "skill-sync" && (
					<>
						<DialogHeader>
							<DialogTitle>
								<Trans>New Skills Detected</Trans>
							</DialogTitle>
							<DialogDescription>
								<Trans>
									The AI identified new skills from your experience that match this job. Select which ones to save back
									to your original resume for future applications. This will permanently modify your original resume and
									cannot be undone.
								</Trans>
							</DialogDescription>
						</DialogHeader>

						<ScrollArea className="max-h-80">
							<div className="flex flex-col gap-y-3">
								{phase.newSkills.map((skill, index) => (
									<button
										type="button"
										key={index}
										className="flex items-center gap-x-3 rounded-md border p-3 text-start hover:bg-muted/50"
										onClick={() => toggleSkill(index)}
									>
										<Switch checked={selectedSkills.has(index)} onCheckedChange={() => toggleSkill(index)} />
										<div className="min-w-0 flex-1">
											<p className="font-medium text-sm">{skill.name}</p>
											{skill.proficiency && <p className="text-muted-foreground text-xs">{skill.proficiency}</p>}
											{skill.keywords.length > 0 && (
												<div className="mt-1.5 flex flex-wrap gap-1">
													{skill.keywords.map((kw) => (
														<Badge key={kw} variant="secondary" className="text-[10px]">
															{kw}
														</Badge>
													))}
												</div>
											)}
										</div>
									</button>
								))}
							</div>
						</ScrollArea>

						<DialogFooter>
							<Button variant="outline" onClick={handleSkipSync}>
								<Trans>Skip</Trans>
							</Button>
							<Button onClick={handleSkillSync}>
								<Trans>Save {selectedSkills.size} Skills</Trans>
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
