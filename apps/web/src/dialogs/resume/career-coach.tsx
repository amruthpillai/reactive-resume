import type { CareerCoachPlan } from "@reactive-resume/schema/resume/assistant";
import type { DialogProps } from "../store";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { BrainIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { Combobox } from "@/components/ui/combobox";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";
import { useAppForm } from "@/libs/tanstack-form";

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
		resumeId: z.string(),
		language: languageSchema,
		currentSituation: z.string().trim().max(12000),
		targetRole: z.string().trim().max(2000),
		jobDescription: z.string().trim().max(20000),
		goals: z.string().trim().max(4000),
		constraints: z.string().trim().max(4000),
		timeframe: z.string().trim().max(1000),
		location: z.string().trim().max(1000),
	})
	.refine(
		(value) =>
			Boolean(value.resumeId) ||
			Boolean(value.currentSituation) ||
			Boolean(value.targetRole) ||
			Boolean(value.jobDescription),
		{ message: "Select a resume, describe your situation, add a target role, or paste a job description." },
	);

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
	resumeId: "",
	language: "en",
	currentSituation: "",
	targetRole: "",
	jobDescription: "",
	goals: "",
	constraints: "",
	timeframe: "",
	location: "",
};

function PlanList({ items }: { items: string[] }) {
	if (items.length === 0) return null;

	return (
		<ul className="list-disc space-y-1 ps-5 text-sm">
			{items.map((item) => (
				<li key={item}>{item}</li>
			))}
		</ul>
	);
}

function PlanSection({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="space-y-2 rounded-lg border p-3">
			<h3 className="font-medium text-sm">{title}</h3>
			{children}
		</section>
	);
}

function CareerCoachPlanView({ plan }: { plan: CareerCoachPlan }) {
	return (
		<div className="space-y-3">
			<div className="space-y-2 rounded-lg border bg-muted/20 p-3">
				<div className="flex flex-wrap gap-2">
					{plan.targetRoles.map((role) => (
						<Badge key={role} variant="secondary">
							{role}
						</Badge>
					))}
				</div>
				<p className="text-sm">{plan.summary}</p>
				<p className="text-muted-foreground text-sm">{plan.positioning}</p>
			</div>

			<PlanSection title={t`Strengths to leverage`}>
				<PlanList items={plan.strengthsToLeverage} />
			</PlanSection>

			<PlanSection title={t`Gaps to close`}>
				<PlanList items={plan.gaps} />
			</PlanSection>

			<PlanSection title={t`Action plan`}>
				<div className="space-y-3">
					{plan.actions.map((action) => (
						<div key={action.title} className="space-y-1">
							<div className="flex flex-wrap items-center gap-2">
								<p className="font-medium text-sm">{action.title}</p>
								<Badge variant="outline">{action.priority}</Badge>
								{action.timeframe ? <Badge variant="secondary">{action.timeframe}</Badge> : null}
							</div>
							<p className="text-muted-foreground text-sm">{action.rationale}</p>
							<PlanList items={action.steps} />
							{action.successMetric ? <p className="text-muted-foreground text-xs">{action.successMetric}</p> : null}
						</div>
					))}
				</div>
			</PlanSection>

			<PlanSection title={t`Resume strategy`}>
				<PlanList items={plan.resumeStrategy} />
			</PlanSection>

			<PlanSection title={t`LinkedIn strategy`}>
				<PlanList items={plan.linkedinStrategy} />
			</PlanSection>

			<PlanSection title={t`Networking`}>
				<PlanList items={plan.networkingPlan} />
			</PlanSection>

			<PlanSection title={t`Interview preparation`}>
				<PlanList items={plan.interviewPrep} />
			</PlanSection>

			<PlanSection title={t`Salary strategy`}>
				<PlanList items={plan.salaryStrategy} />
			</PlanSection>

			<PlanSection title={t`Weekly plan`}>
				<div className="space-y-3">
					{plan.weeklyPlan.map((week) => (
						<div key={week.week} className="space-y-1">
							<p className="font-medium text-sm">
								{week.week}: {week.focus}
							</p>
							<PlanList items={week.tasks} />
						</div>
					))}
				</div>
			</PlanSection>

			{plan.cautions.length > 0 ? (
				<PlanSection title={t`Watch-outs`}>
					<PlanList items={plan.cautions} />
				</PlanSection>
			) : null}
		</div>
	);
}

export function CareerCoachDialog(_: DialogProps<"resume.career-coach">) {
	const [plan, setPlan] = useState<CareerCoachPlan | null>(null);
	const { mutateAsync: coachCareer, isPending } = useMutation(orpc.ai.coachCareer.mutationOptions());
	const { data: resumes } = useQuery(orpc.resume.list.queryOptions({ input: { tags: [], sort: "lastUpdatedAt" } }));
	const { data: aiProviders, isLoading: isLoadingAiProviders } = useQuery(orpc.aiProviders.list.queryOptions());
	const hasAIProvider = aiProviders?.some((provider) => provider.enabled && provider.testStatus === "success") ?? false;

	const resumeOptions =
		resumes?.map((resume) => ({
			value: resume.id,
			label: resume.name,
		})) ?? [];

	const form = useAppForm({
		defaultValues,
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			if (isLoadingAiProviders) throw new Error(t`Loading AI providers. Please try again in a moment.`);
			if (!hasAIProvider)
				throw new Error(t`This feature requires a tested AI provider. Please add one in the settings.`);

			const toastId = toast.loading(t`Building your career plan...`, {
				description: t`The coach is reviewing your resume, goals, and market positioning.`,
			});

			try {
				const result = await coachCareer({
					resumeId: value.resumeId || undefined,
					language: value.language,
					currentSituation: value.currentSituation || undefined,
					targetRole: value.targetRole || undefined,
					jobDescription: value.jobDescription || undefined,
					goals: value.goals || undefined,
					constraints: value.constraints || undefined,
					timeframe: value.timeframe || undefined,
					location: value.location || undefined,
				});

				setPlan(result);
				toast.success(t`Career plan ready.`, { id: toastId });
			} catch (error) {
				toast.error(
					getOrpcErrorMessage(error, {
						byCode: {
							BAD_GATEWAY: t`Could not reach the AI provider. Please try again.`,
							BAD_REQUEST: t`The AI returned an invalid career plan. Please try again.`,
						},
						fallback: t`An unknown error occurred while building your career plan.`,
					}),
					{ id: toastId, description: null },
				);
			}
		},
	});

	useFormBlocker(form);

	return (
		<DialogContent className="xl:max-w-4xl">
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<BrainIcon />
					<Trans>Career coach</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Build a practical plan for target roles, skills, interviews, LinkedIn, and compensation.</Trans>
				</DialogDescription>
			</DialogHeader>

			<form
				className="max-h-[72vh] space-y-4 overflow-y-auto pe-2"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<div className="grid gap-4 md:grid-cols-2">
					<form.Field name="resumeId">
						{(field) => (
							<FormItem>
								<FormLabel>
									<Trans>Resume</Trans>
								</FormLabel>
								<FormControl
									render={
										<Combobox
											showClear
											value={field.state.value || null}
											onValueChange={(value) => field.handleChange(value ?? "")}
											options={resumeOptions}
											placeholder={t`Optional`}
										/>
									}
								/>
								<FormDescription>
									<Trans>Use one of your resumes as coaching context.</Trans>
								</FormDescription>
							</FormItem>
						)}
					</form.Field>

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

					<form.Field name="currentSituation">
						{(field) => (
							<FormItem className="md:col-span-2">
								<FormLabel>
									<Trans>Current situation</Trans>
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

					<form.Field name="jobDescription">
						{(field) => (
							<FormItem className="md:col-span-2">
								<FormLabel>
									<Trans>Job description</Trans>
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

					<form.Field name="goals">
						{(field) => (
							<FormItem>
								<FormLabel>
									<Trans>Goals</Trans>
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
							<FormItem>
								<FormLabel>
									<Trans>Constraints</Trans>
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

					<form.Field name="timeframe">
						{(field) => (
							<FormItem className="md:col-span-2">
								<FormLabel>
									<Trans>Timeframe</Trans>
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
								<FormMessage errors={field.state.meta.errors} />
							</FormItem>
						)}
					</form.Field>
				</div>

				<DialogFooter>
					<Button type="submit" disabled={isPending || isLoadingAiProviders || !hasAIProvider}>
						{isPending ? <Spinner /> : null}
						{isPending ? t`Generating...` : t`Generate plan`}
					</Button>
				</DialogFooter>

				{plan ? <CareerCoachPlanView plan={plan} /> : null}
			</form>
		</DialogContent>
	);
}
