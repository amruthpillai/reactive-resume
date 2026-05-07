import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon, InfoIcon, LightningIcon, SparkleIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { match } from "ts-pattern";
import { useAIStore } from "@reactive-resume/ai/store";
import { Alert, AlertDescription } from "@reactive-resume/ui/components/alert";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { useResume } from "@/components/resume/use-resume";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";
import { SectionBase } from "../shared/section-base";

function impactCircleClass(impact: "high" | "medium" | "low") {
	return match(impact)
		.with("high", () => "bg-rose-600")
		.with("medium", () => "bg-amber-600")
		.with("low", () => "bg-emerald-600")
		.exhaustive();
}

function impactLabel(impact: "high" | "medium" | "low") {
	return match(impact)
		.with("high", () =>
			t({
				comment: "Impact severity label in resume analysis suggestion card",
				message: "High",
			}),
		)
		.with("medium", () =>
			t({
				comment: "Impact severity label in resume analysis suggestion card",
				message: "Medium",
			}),
		)
		.with("low", () =>
			t({
				comment: "Impact severity label in resume analysis suggestion card",
				message: "Low",
			}),
		)
		.exhaustive();
}

export function ResumeAnalysisSectionBuilder() {
	const queryClient = useQueryClient();

	const resume = useResume();
	const aiEnabled = useAIStore((state) => state.enabled);
	const aiProvider = useAIStore((state) => state.provider);
	const aiModel = useAIStore((state) => state.model);
	const aiApiKey = useAIStore((state) => state.apiKey);
	const aiBaseURL = useAIStore((state) => state.baseURL);

	const resumeId = resume?.id ?? "";

	const analysisQuery = useQuery({
		...orpc.resume.analysis.getById.queryOptions({ input: { id: resumeId } }),
		enabled: !!resume,
	});

	const { mutate: analyzeResume, isPending } = useMutation({
		...orpc.ai.analyzeResume.mutationOptions(),
		onSuccess: (analysis) => {
			queryClient.setQueryData(orpc.resume.analysis.getById.queryKey({ input: { id: resumeId } }), analysis);
			toast.success(t`Resume analysis complete.`);
		},
		onError: (error) => {
			toast.error(t`Failed to analyze resume.`, {
				description: getOrpcErrorMessage(error, {
					byCode: {
						BAD_REQUEST: t({
							comment: "Error description when AI returns invalid resume analysis format",
							message: "The AI returned an invalid analysis format. Please try again.",
						}),
						BAD_GATEWAY: t({
							comment: "Error description when AI provider cannot be reached during resume analysis",
							message: "Could not reach the AI provider. Please try again.",
						}),
					},
					fallback: t({
						comment: "Fallback error description when resume analysis request fails",
						message: "Something went wrong while analyzing your resume.",
					}),
				}),
			});
		},
	});

	const analysis = analysisQuery.data;
	const score = analysis?.overallScore ?? null;
	const analyzeLabel = isPending ? t`Analyzing...` : t`Analyze Resume`;

	const scoreTone = useMemo(() => {
		if (score == null) return "bg-muted";
		if (score >= 80) return "bg-emerald-600";
		if (score >= 60) return "bg-amber-600";
		return "bg-rose-600";
	}, [score]);

	const onAnalyze = () => {
		if (!resume) return;

		analyzeResume({
			provider: aiProvider,
			model: aiModel,
			apiKey: aiApiKey,
			baseURL: aiBaseURL,
			resumeId: resume.id,
			resumeData: resume.data,
		});
	};

	if (!resume) return null;

	return (
		<SectionBase type="analysis" className="space-y-4">
			{!aiEnabled && <DisabledState />}

			{aiEnabled && (
				<div className="space-y-3">
					<div className="space-y-4 rounded-md border bg-card p-3">
						<div className="grid grid-cols-2 items-center gap-3">
							<div>
								<p className="text-muted-foreground text-xs">
									<Trans>
										Get a review of your resume with an overall score, strengths, and actionable suggestions.
									</Trans>
								</p>
							</div>

							<Button disabled={isPending} onClick={onAnalyze} className="ml-auto w-fit">
								<SparkleIcon />
								{analyzeLabel}
							</Button>
						</div>

						<div className="grid grid-cols-[auto_1fr] items-center gap-3">
							<div
								className={`grid size-18 place-items-center rounded-full border-3 border-background font-bold text-lg text-white ${scoreTone}`}
							>
								{score ?? "--"}
							</div>

							<div className="space-y-3">
								<p className="font-medium text-sm leading-none">
									<Trans>Overall Score</Trans>
								</p>
								<div className="grid grid-cols-10 gap-1">
									{Array.from({ length: 10 }).map((_, index) => {
										const active = score != null && index < Math.round(score / 10);
										return (
											<div
												key={`scorebar-${index}`}
												className={`h-1.5 rounded-full transition-colors ${active ? "bg-primary" : "bg-muted"}`}
											/>
										);
									})}
								</div>
								{analysis?.updatedAt && (
									<p className="text-muted-foreground text-xs leading-none">
										<Trans>Last analyzed on {new Date(analysis.updatedAt).toLocaleString()}</Trans>
									</p>
								)}
							</div>
						</div>
					</div>

					{analysisQuery.isFetched && !analysis && !isPending && (
						<div className="rounded-md border border-dashed p-3">
							<p className="max-w-xs text-muted-foreground text-sm">
								<Trans>Run your first analysis to get a scorecard, strengths, and prioritized suggestions.</Trans>
							</p>
						</div>
					)}

					{analysis && (
						<div className="space-y-4">
							<div className="space-y-3 rounded-md border p-3">
								<h5 className="flex items-center gap-2 font-semibold text-sm">
									<LightningIcon className="text-primary" />
									<Trans>Scorecard</Trans>
								</h5>

								<div className="space-y-3">
									{analysis.scorecard.map((item) => (
										<div key={item.dimension} className="space-y-3 rounded-md border bg-card p-3">
											<div className="flex items-center justify-between gap-2">
												<div className="font-medium text-sm">{item.dimension}</div>
												<Badge variant="secondary">{item.score}/100</Badge>
											</div>
											<p className="text-muted-foreground text-xs">{item.rationale}</p>
										</div>
									))}
								</div>
							</div>

							{analysis.strengths.length > 0 && (
								<div className="space-y-3 rounded-md border p-3">
									<h5 className="font-semibold text-sm">
										<Trans>Strengths</Trans>
									</h5>

									<ul className="list-outside list-disc pl-5 text-muted-foreground text-sm">
										{analysis.strengths.map((strength) => (
											<li key={strength} className="py-1.5">
												{strength}
											</li>
										))}
									</ul>
								</div>
							)}

							{analysis.suggestions.length > 0 && (
								<div className="space-y-4 rounded-md border p-3">
									<h5 className="font-semibold text-sm">
										<Trans>Suggestions</Trans>
									</h5>

									<div className="space-y-3">
										{analysis.suggestions.map((suggestion) => (
											<div key={suggestion.title} className="space-y-3 rounded-md border bg-card p-3">
												<div className="flex items-center gap-2">
													<span
														role="img"
														className={`size-2.5 shrink-0 rounded-full ring-1 ring-border ${impactCircleClass(suggestion.impact)}`}
														title={impactLabel(suggestion.impact)}
														aria-label={impactLabel(suggestion.impact)}
													/>
													<div className="font-semibold text-sm tracking-tight">{suggestion.title}</div>
												</div>

												<div className="text-muted-foreground text-xs">{suggestion.why}</div>

												{suggestion.exampleRewrite && (
													<div className="rounded bg-muted p-2 text-muted-foreground text-xs">
														{suggestion.exampleRewrite}
													</div>
												)}
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</SectionBase>
	);
}

function DisabledState() {
	return (
		<Alert>
			<InfoIcon />
			<AlertDescription className="space-y-3">
				<p>
					<Trans>
						Get an in-depth AI-powered review of your resume with an overall score, key strengths, and practical
						suggestions. To activate this feature, please update your AI settings.
					</Trans>
				</p>

				<Button
					size="sm"
					variant="outline"
					nativeButton={false}
					render={
						<Link to="/dashboard/settings/integrations">
							<Trans>Open Integrations Settings</Trans>
							<ArrowRightIcon />
						</Link>
					}
				/>
			</AlertDescription>
		</Alert>
	);
}
