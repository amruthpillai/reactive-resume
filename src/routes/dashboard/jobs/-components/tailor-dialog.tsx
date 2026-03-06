import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ReadCvLogoIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
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
import { orpc } from "@/integrations/orpc/client";
import type { JobResult } from "@/schema/jobs";
import { slugify } from "@/utils/string";

type Props = {
	job: JobResult;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function TailorDialog({ job, open, onOpenChange }: Props) {
	const navigate = useNavigate();
	const { data: resumes, isLoading } = useQuery(orpc.resume.list.queryOptions());

	const { mutate: duplicateResume, isPending } = useMutation(orpc.resume.duplicate.mutationOptions());

	const handleSelectResume = (resumeId: string, resumeName: string) => {
		const tailorName = `${resumeName} - ${job.job_title}`;
		const tailorSlug = slugify(`${tailorName}-${Date.now()}`);

		duplicateResume(
			{ id: resumeId, name: tailorName, slug: tailorSlug, tags: ["tailored"] },
			{
				onSuccess: (newResumeId) => {
					onOpenChange(false);

					const tailorPrompt = [
						`Tailor this resume for the following position:`,
						``,
						`Job Title: ${job.job_title}`,
						`Company: ${job.employer_name}`,
						job.job_description ? `\nJob Description:\n${job.job_description.slice(0, 2000)}` : "",
					]
						.filter(Boolean)
						.join("\n");

					navigate({
						to: "/builder/$resumeId",
						params: { resumeId: newResumeId },
						search: { tailor: tailorPrompt },
					});
				},
				onError: (error) => {
					toast.error(t`Failed to duplicate resume`, { description: error.message });
				},
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<Trans>Tailor Resume</Trans>
					</DialogTitle>
					<DialogDescription>
						<Trans>
							Select a resume to tailor for "{job.job_title}" at {job.employer_name}. A copy will be created and the AI
							assistant will help optimize it for this position.
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
									disabled={isPending}
									onClick={() => handleSelectResume(resume.id, resume.name)}
								>
									<ReadCvLogoIcon className="size-5 shrink-0" />
									<div className="min-w-0 text-start">
										<p className="truncate font-medium">{resume.name}</p>
										<p className="truncate text-muted-foreground text-xs">
											{new Date(resume.updatedAt).toLocaleDateString()}
										</p>
									</div>
									{isPending && <Spinner className="ms-auto" />}
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
					<DialogClose asChild>
						<Button variant="outline">
							<Trans>Cancel</Trans>
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
