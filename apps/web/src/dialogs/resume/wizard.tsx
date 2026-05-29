import type { JobScamAnalysis, ResumeWizardDraft } from "@reactive-resume/schema/resume/assistant";
import type { DialogProps } from "../store";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { MagicWandIcon, WarningIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@reactive-resume/ui/components/dialog";
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { Switch } from "@reactive-resume/ui/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@reactive-resume/ui/components/tabs";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { slugify } from "@reactive-resume/utils/string";
import { Combobox } from "@/components/ui/combobox";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";
import { useAppForm } from "@/libs/tanstack-form";
import { useDialogStore } from "../store";

type Language = "en" | "es" | "fr" | "ar" | "pt" | "de" | "ja" | "ko" | "zh";

const languages: Array<{ value: Language; label: string }> = [
	{ value: "en", label: "English" },
	{ value: "es", label: "Spanish" },
	{ value: "fr", label: "French" },
	{ value: "ar", label: "Arabic" },
	{ value: "pt", label: "Portuguese" },
	{ value: "de", label: "Deutsch" },
	{ value: "ja", label: "Japanese" },
	{ value: "ko", label: "Korean" },
	{ value: "zh", label: "Mandarin Chinese" },
];

const languageSchema = z.enum(["en", "es", "fr", "ar", "pt", "de", "ja", "ko", "zh"]);

const formSchema = z
	.object({
		mode: z.enum(["essay", "guided"]),
		language: languageSchema,
		essay: z.string().trim().max(12000),
		targetRole: z.string().trim().max(4000),
		seniority: z.string().trim().max(1000),
		workHistory: z.string().trim().max(8000),
		education: z.string().trim().max(4000),
		skills: z.string().trim().max(4000),
		achievements: z.string().trim().max(4000),
		links: z.string().trim().max(2000),
		constraints: z.string().trim().max(2000),
		jobDescription: z.string().trim().max(20000),
		includeSalaryNegotiation: z.boolean(),
		includeLinkedInProfile: z.boolean(),
		offerText: z.string().trim().max(12000),
		targetSalary: z.string().trim().max(1000),
		location: z.string().trim().max(1000),
	})
	.refine(
		(value) =>
			Boolean(value.essay) ||
			[
				value.targetRole,
				value.seniority,
				value.workHistory,
				value.education,
				value.skills,
				value.achievements,
				value.links,
				value.constraints,
			].some(Boolean),
		{ message: "Write an essay or answer at least one guided question." },
	);

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
	mode: "essay",
	language: "en",
	essay: "",
	targetRole: "",
	seniority: "",
	workHistory: "",
	education: "",
	skills: "",
	achievements: "",
	links: "",
	constraints: "",
	jobDescription: "",
	includeSalaryNegotiation: false,
	includeLinkedInProfile: true,
	offerText: "",
	targetSalary: "",
	location: "",
};

function escapeHtml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function listItems(items: string[]) {
	return items.length > 0 ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";
}

function buildStrategyNotes(draft: ResumeWizardDraft) {
	const salary = draft.salaryNegotiation;
	const salaryNotes = salary
		? `<h3>Salary negotiation</h3><p>${escapeHtml(salary.marketPositioning)}</p>${listItems(salary.leveragePoints)}<p>${escapeHtml(salary.emailTemplate)}</p>`
		: "";
	const linkedin = draft.linkedinProfile;
	const linkedinNotes = linkedin
		? [
				"<h3>LinkedIn profile</h3>",
				`<p><strong>Headline:</strong> ${escapeHtml(linkedin.headline)}</p>`,
				`<p>${escapeHtml(linkedin.about)}</p>`,
				linkedin.featuredSuggestions.length > 0
					? `<h4>Featured section ideas</h4>${listItems(linkedin.featuredSuggestions)}`
					: "",
				linkedin.skills.length > 0 ? `<h4>Skills</h4>${listItems(linkedin.skills)}` : "",
				`<p><strong>Connection note:</strong> ${escapeHtml(linkedin.connectionNote)}</p>`,
				`<p><strong>Recruiter message:</strong> ${escapeHtml(linkedin.recruiterMessage)}</p>`,
			]
				.filter(Boolean)
				.join("")
		: "";

	return [
		"<h2>Wizard strategy notes</h2>",
		`<p>ATS score: ${draft.ats.overallScore}/100. ${escapeHtml(draft.ats.summary)}</p>`,
		draft.ats.missingKeywords.length > 0 ? `<h3>Missing keywords</h3>${listItems(draft.ats.missingKeywords)}` : "",
		draft.growth.suggestions.length > 0
			? `<h3>Growth suggestions</h3>${listItems(
					draft.growth.suggestions.map((suggestion) => `${suggestion.title}: ${suggestion.rationale}`),
				)}`
			: "",
		salaryNotes,
		linkedinNotes,
		draft.notes.length > 0 ? `<h3>Notes</h3>${listItems(draft.notes)}` : "",
	]
		.filter(Boolean)
		.join("");
}

function getRiskLevelLabel(level: JobScamAnalysis["riskLevel"]) {
	switch (level) {
		case "low":
			return t`Low risk`;
		case "medium":
			return t`Medium risk`;
		case "high":
			return t`High risk`;
		case "critical":
			return t`Critical risk`;
	}
}

function getRiskLevelClassName(level: JobScamAnalysis["riskLevel"]) {
	switch (level) {
		case "low":
			return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
		case "medium":
			return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
		case "high":
			return "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300";
		case "critical":
			return "border-destructive/30 bg-destructive/10 text-destructive";
	}
}

function getSeverityLabel(severity: JobScamAnalysis["redFlags"][number]["severity"]) {
	switch (severity) {
		case "low":
			return t`Low`;
		case "medium":
			return t`Medium`;
		case "high":
			return t`High`;
	}
}

function getSeverityVariant(severity: JobScamAnalysis["redFlags"][number]["severity"]) {
	switch (severity) {
		case "low":
			return "outline";
		case "medium":
			return "secondary";
		case "high":
			return "destructive";
	}
}

function ScamAnalysisList({ title, items }: { title: string; items: string[] }) {
	if (items.length === 0) return null;

	return (
		<section className="space-y-2">
			<h4 className="font-medium text-xs">{title}</h4>
			<ul className="list-disc space-y-1 ps-5 text-muted-foreground text-xs">
				{items.map((item) => (
					<li key={item}>{item}</li>
				))}
			</ul>
		</section>
	);
}

function ScamDetectorResult({ analysis }: { analysis: JobScamAnalysis }) {
	return (
		<div className="space-y-3 rounded-lg border bg-muted/20 p-3">
			<div className="flex flex-wrap items-center gap-2">
				<Badge variant="outline" className={getRiskLevelClassName(analysis.riskLevel)}>
					{getRiskLevelLabel(analysis.riskLevel)}
				</Badge>
				<Badge variant="secondary">
					<Trans>Risk score</Trans>: {analysis.riskScore}/100
				</Badge>
			</div>

			<p className="text-sm">{analysis.summary}</p>

			{analysis.redFlags.length > 0 ? (
				<section className="space-y-2">
					<h4 className="font-medium text-xs">
						<Trans>Possible red flags</Trans>
					</h4>
					<div className="space-y-2">
						{analysis.redFlags.map((flag) => (
							<div key={`${flag.title}-${flag.evidence}`} className="space-y-1 rounded-md border p-2">
								<div className="flex flex-wrap items-center gap-2">
									<p className="font-medium text-sm">{flag.title}</p>
									<Badge variant={getSeverityVariant(flag.severity)}>{getSeverityLabel(flag.severity)}</Badge>
								</div>
								<p className="text-muted-foreground text-xs">{flag.evidence}</p>
								<p className="text-xs">{flag.candidateAction}</p>
							</div>
						))}
					</div>
				</section>
			) : null}

			<div className="grid gap-3 md:grid-cols-2">
				<ScamAnalysisList title={t`Reassuring signals`} items={analysis.reassuringSignals} />
				<ScamAnalysisList title={t`Verification questions`} items={analysis.verificationQuestions} />
				<ScamAnalysisList title={t`Safe next steps`} items={analysis.safeNextSteps} />
				<ScamAnalysisList title={t`Avoid until verified`} items={analysis.avoidUntilVerified} />
			</div>
		</div>
	);
}

export function WizardResumeDialog(_: DialogProps<"resume.wizard">) {
	const navigate = useNavigate();
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const [scamAnalysis, setScamAnalysis] = useState<JobScamAnalysis | null>(null);

	const { mutateAsync: generateDraft, isPending: isGenerating } = useMutation(
		orpc.ai.generateResumeDraft.mutationOptions(),
	);
	const { mutateAsync: detectJobScam, isPending: isDetectingScam } = useMutation(
		orpc.ai.detectJobScam.mutationOptions(),
	);
	const { mutateAsync: importResume, isPending: isImporting } = useMutation(orpc.resume.import.mutationOptions());
	const { data: aiProviders, isLoading: isLoadingAiProviders } = useQuery(orpc.aiProviders.list.queryOptions());
	const hasAIProvider = aiProviders?.some((provider) => provider.enabled && provider.testStatus === "success") ?? false;
	const isPending = isGenerating || isImporting;

	const form = useAppForm({
		defaultValues,
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			if (isLoadingAiProviders) throw new Error(t`Loading AI providers. Please try again in a moment.`);
			if (!hasAIProvider)
				throw new Error(t`This feature requires a tested AI provider. Please add one in the settings.`);

			const toastId = toast.loading(t`Building your resume draft...`, {
				description: t`This may take a minute while the AI turns your experience into structured resume sections.`,
			});

			try {
				const draft = await generateDraft({
					mode: value.mode,
					language: value.language,
					essay: value.essay || undefined,
					answers: {
						targetRole: value.targetRole || undefined,
						seniority: value.seniority || undefined,
						workHistory: value.workHistory || undefined,
						education: value.education || undefined,
						skills: value.skills || undefined,
						achievements: value.achievements || undefined,
						links: value.links || undefined,
						constraints: value.constraints || undefined,
					},
					jobDescription: value.jobDescription || undefined,
					includeSalaryNegotiation: value.includeSalaryNegotiation,
					includeLinkedInProfile: value.includeLinkedInProfile,
					offerText: value.offerText || undefined,
					targetSalary: value.targetSalary || undefined,
					location: value.location || undefined,
				});

				const data = structuredClone(draft.resumeData);
				data.metadata.notes = buildStrategyNotes(draft);

				const id = await importResume({
					name: draft.resumeName,
					slug: slugify(draft.resumeName),
					tags: ["wizard"],
					data,
				});

				toast.success(t`Your wizard resume is ready.`, {
					id: toastId,
					description: t`ATS, growth, and salary notes were saved in the resume notes.`,
				});
				closeDialog();
				void navigate({ to: "/builder/$resumeId", params: { resumeId: id } });
			} catch (error) {
				toast.error(
					getOrpcErrorMessage(error, {
						byCode: {
							BAD_GATEWAY: t`Could not reach the AI provider. Please try again.`,
							BAD_REQUEST: t`The AI returned an invalid resume draft. Please try again.`,
						},
						fallback: t`An unknown error occurred while building your resume draft.`,
					}),
					{ id: toastId, description: null },
				);
			}
		},
	});

	const mode = useStore(form.store, (s) => s.values.mode);
	const language = useStore(form.store, (s) => s.values.language);
	const jobDescription = useStore(form.store, (s) => s.values.jobDescription);
	const includeSalaryNegotiation = useStore(form.store, (s) => s.values.includeSalaryNegotiation);
	const includeLinkedInProfile = useStore(form.store, (s) => s.values.includeLinkedInProfile);

	const runScamDetector = async () => {
		if (isLoadingAiProviders) {
			toast.error(t`Loading AI providers. Please try again in a moment.`);
			return;
		}

		if (!hasAIProvider) {
			toast.error(t`This feature requires a tested AI provider. Please add one in the settings.`);
			return;
		}

		const trimmedJobDescription = jobDescription.trim();
		if (!trimmedJobDescription) {
			toast.error(t`Paste a job description before running the scam detector.`);
			return;
		}

		const toastId = toast.loading(t`Checking the job post...`, {
			description: t`The scam detector is reviewing risk signals and verification steps.`,
		});

		try {
			const result = await detectJobScam({
				language,
				jobDescription: trimmedJobDescription,
			});

			setScamAnalysis(result);
			toast.success(t`Scam detector finished.`, { id: toastId });
		} catch (error) {
			toast.error(
				getOrpcErrorMessage(error, {
					byCode: {
						BAD_GATEWAY: t`Could not reach the AI provider. Please try again.`,
						BAD_REQUEST: t`The AI returned an invalid scam analysis. Please try again.`,
					},
					fallback: t`An unknown error occurred while checking this job post.`,
				}),
				{ id: toastId, description: null },
			);
		}
	};

	useFormBlocker(form);

	return (
		<DialogContent className="xl:max-w-3xl">
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<MagicWandIcon />
					<Trans>Wizard mode</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Generate a tailored resume from your experience, a target job, and optional offer details.</Trans>
				</DialogDescription>
			</DialogHeader>

			<form
				className="space-y-4"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<form.Field name="language">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Language</Trans>
							</FormLabel>
							<FormControl
								render={
									<Combobox
										showClear={false}
										value={field.state.value}
										onValueChange={(value) => field.handleChange(value as FormValues["language"])}
										options={languages}
									/>
								}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<Tabs value={mode} onValueChange={(value) => form.setFieldValue("mode", value as FormValues["mode"])}>
					<TabsList className="w-full">
						<TabsTrigger value="essay">
							<Trans>Essay</Trans>
						</TabsTrigger>
						<TabsTrigger value="guided">
							<Trans>Guided</Trans>
						</TabsTrigger>
					</TabsList>

					<TabsContent value="essay" className="space-y-4">
						<form.Field name="essay">
							{(field) => (
								<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
									<FormLabel>
										<Trans>Experience essay</Trans>
									</FormLabel>
									<FormControl
										render={
											<Textarea
												rows={10}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.value)}
											/>
										}
									/>
									<FormDescription>
										<Trans>
											Include roles, projects, tools, achievements, education, and anything you want highlighted.
										</Trans>
									</FormDescription>
									<FormMessage errors={field.state.meta.errors} />
								</FormItem>
							)}
						</form.Field>
					</TabsContent>

					<TabsContent value="guided" className="grid gap-4 md:grid-cols-2">
						<form.Field name="targetRole">
							{(field) => (
								<FormItem>
									<FormLabel>
										<Trans>Target role</Trans>
									</FormLabel>
									<FormControl
										render={
											<Input
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.value)}
											/>
										}
									/>
								</FormItem>
							)}
						</form.Field>
						<form.Field name="seniority">
							{(field) => (
								<FormItem>
									<FormLabel>
										<Trans>Seniority</Trans>
									</FormLabel>
									<FormControl
										render={
											<Input
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.value)}
											/>
										}
									/>
								</FormItem>
							)}
						</form.Field>
						<form.Field name="workHistory">
							{(field) => (
								<FormItem className="md:col-span-2">
									<FormLabel>
										<Trans>Work history</Trans>
									</FormLabel>
									<FormControl
										render={
											<Textarea
												rows={5}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.value)}
											/>
										}
									/>
								</FormItem>
							)}
						</form.Field>
						<form.Field name="education">
							{(field) => (
								<FormItem>
									<FormLabel>
										<Trans>Education</Trans>
									</FormLabel>
									<FormControl
										render={
											<Textarea
												rows={4}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.value)}
											/>
										}
									/>
								</FormItem>
							)}
						</form.Field>
						<form.Field name="skills">
							{(field) => (
								<FormItem>
									<FormLabel>
										<Trans>Skills</Trans>
									</FormLabel>
									<FormControl
										render={
											<Textarea
												rows={4}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.value)}
											/>
										}
									/>
								</FormItem>
							)}
						</form.Field>
						<form.Field name="achievements">
							{(field) => (
								<FormItem>
									<FormLabel>
										<Trans>Achievements</Trans>
									</FormLabel>
									<FormControl
										render={
											<Textarea
												rows={4}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.value)}
											/>
										}
									/>
								</FormItem>
							)}
						</form.Field>
						<form.Field name="links">
							{(field) => (
								<FormItem>
									<FormLabel>
										<Trans>Links</Trans>
									</FormLabel>
									<FormControl
										render={
											<Textarea
												rows={4}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.value)}
											/>
										}
									/>
								</FormItem>
							)}
						</form.Field>
						<form.Field name="constraints">
							{(field) => (
								<FormItem className="md:col-span-2">
									<FormLabel>
										<Trans>Constraints</Trans>
									</FormLabel>
									<FormControl
										render={
											<Textarea
												rows={3}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.value)}
											/>
										}
									/>
								</FormItem>
							)}
						</form.Field>
					</TabsContent>
				</Tabs>

				<form.Field name="jobDescription">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<FormLabel>
									<Trans>Job offer text</Trans>
								</FormLabel>
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={isDetectingScam || isLoadingAiProviders || !hasAIProvider}
									onClick={() => void runScamDetector()}
								>
									{isDetectingScam ? <Spinner /> : <WarningIcon />}
									<Trans>Scam detector</Trans>
								</Button>
							</div>
							<FormControl
								render={
									<Textarea
										rows={6}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => {
											field.handleChange(event.target.value);
											setScamAnalysis(null);
										}}
									/>
								}
							/>
							<FormDescription>
								<Trans>Paste a job description to tailor keywords, bullets, ATS scoring, and positioning.</Trans>
							</FormDescription>
							<FormMessage errors={field.state.meta.errors} />
							{scamAnalysis ? <ScamDetectorResult analysis={scamAnalysis} /> : null}
						</FormItem>
					)}
				</form.Field>

				<div className="rounded-lg border p-3">
					<form.Field name="includeSalaryNegotiation">
						{(field) => (
							<FormItem className="flex items-center justify-between gap-4">
								<div className="space-y-1">
									<FormLabel>
										<Trans>Salary negotiation</Trans>
									</FormLabel>
									<FormDescription>
										<Trans>Add negotiation scripts and an email template to the resume notes.</Trans>
									</FormDescription>
								</div>
								<FormControl
									render={
										<Switch checked={field.state.value} onCheckedChange={(checked) => field.handleChange(checked)} />
									}
								/>
							</FormItem>
						)}
					</form.Field>

					{includeSalaryNegotiation ? (
						<div className="mt-4 grid gap-4 md:grid-cols-2">
							<form.Field name="offerText">
								{(field) => (
									<FormItem className="md:col-span-2">
										<FormLabel>
											<Trans>Offer details</Trans>
										</FormLabel>
										<FormControl
											render={
												<Textarea
													rows={4}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(event) => field.handleChange(event.target.value)}
												/>
											}
										/>
									</FormItem>
								)}
							</form.Field>
							<form.Field name="targetSalary">
								{(field) => (
									<FormItem>
										<FormLabel>
											<Trans>Target compensation</Trans>
										</FormLabel>
										<FormControl
											render={
												<Input
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(event) => field.handleChange(event.target.value)}
												/>
											}
										/>
									</FormItem>
								)}
							</form.Field>
							<form.Field name="location">
								{(field) => (
									<FormItem>
										<FormLabel>
											<Trans>Location</Trans>
										</FormLabel>
										<FormControl
											render={
												<Input
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(event) => field.handleChange(event.target.value)}
												/>
											}
										/>
									</FormItem>
								)}
							</form.Field>
						</div>
					) : null}
				</div>

				<div className="rounded-lg border p-3">
					<form.Field name="includeLinkedInProfile">
						{(field) => (
							<FormItem className="flex items-center justify-between gap-4">
								<div className="space-y-1">
									<FormLabel>
										<Trans>LinkedIn profile builder</Trans>
									</FormLabel>
									<FormDescription>
										<Trans>Generate a headline, About section, recruiter message, and profile improvement ideas.</Trans>
									</FormDescription>
								</div>
								<FormControl
									render={
										<Switch checked={field.state.value} onCheckedChange={(checked) => field.handleChange(checked)} />
									}
								/>
							</FormItem>
						)}
					</form.Field>
					{includeLinkedInProfile ? (
						<p className="mt-3 text-muted-foreground text-xs">
							<Trans>LinkedIn content will be saved into the resume notes with the ATS and growth plan.</Trans>
						</p>
					) : null}
				</div>

				<DialogFooter>
					<Button type="submit" disabled={isPending || isLoadingAiProviders || !hasAIProvider}>
						{isPending ? <Spinner /> : null}
						{isPending ? t`Generating...` : t`Generate resume`}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
