import type { AIProvider } from "@reactive-resume/ai/types";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon, ChatCircleDotsIcon, FilePlusIcon, GearSixIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { Label } from "@reactive-resume/ui/components/label";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { Combobox } from "@/components/ui/combobox";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

const searchSchema = z.object({ resumeId: z.string().optional() });

export const Route = createFileRoute("/agent/")({
	component: RouteComponent,
	validateSearch: searchSchema,
});

function providerLabel(provider: { label: string; provider: AIProvider; model: string }) {
	return `${provider.label} · ${provider.provider} · ${provider.model}`;
}

function RouteComponent() {
	const navigate = useNavigate();
	const { resumeId } = Route.useSearch();
	const {
		data: providers,
		isLoading: isLoadingProviders,
		error: providersError,
	} = useQuery(orpc.aiProviders.list.queryOptions());
	const { data: resumes, isLoading: isLoadingResumes } = useQuery(
		orpc.resume.list.queryOptions({ input: { sort: "lastUpdatedAt", tags: [] } }),
	);
	const { mutate: createThread, isPending } = useMutation(orpc.agent.threads.create.mutationOptions());

	const usableProviders = useMemo(
		() => providers?.filter((provider) => provider.enabled && provider.testStatus === "success") ?? [],
		[providers],
	);
	const [aiProviderId, setAiProviderId] = useState<string | null>(null);
	const [sourceResumeId, setSourceResumeId] = useState<string | null>(resumeId ?? null);

	useEffect(() => {
		if (aiProviderId || usableProviders.length === 0) return;
		setAiProviderId(usableProviders[0]?.id ?? null);
	}, [aiProviderId, usableProviders]);

	useEffect(() => {
		setSourceResumeId(resumeId ?? null);
	}, [resumeId]);

	const providerOptions = usableProviders.map((provider) => ({
		value: provider.id,
		label: providerLabel(provider),
		keywords: [provider.label, provider.provider, provider.model],
	}));

	const resumeOptions = [
		{ value: "__scratch__", label: t`Create from scratch` },
		...(resumes?.map((resume) => ({
			value: resume.id,
			label: resume.name,
			keywords: [resume.name, resume.slug, ...resume.tags],
		})) ?? []),
	];

	const selectedResumeValue = sourceResumeId ?? "__scratch__";
	const canCreate = !!aiProviderId && usableProviders.length > 0;

	return (
		<div className="flex min-h-svh bg-background">
			<main className="mx-auto grid w-full max-w-3xl content-center gap-8 p-6">
				<div className="space-y-3">
					<div className="grid size-12 place-items-center rounded-md bg-primary text-primary-foreground">
						<ChatCircleDotsIcon className="size-6" weight="fill" />
					</div>
					<div className="space-y-2">
						<h1 className="font-semibold text-3xl tracking-tight">
							<Trans>AI Agent</Trans>
						</h1>
						<p className="max-w-2xl text-muted-foreground">
							<Trans>
								Start with a blank resume or duplicate an existing one, then work with the agent in a dedicated
								workspace.
							</Trans>
						</p>
					</div>
				</div>

				{providersError ? (
					<div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950 text-sm dark:bg-amber-950/20 dark:text-amber-200">
						<Trans>AI agent setup is unavailable until REDIS_URL and ENCRYPTION_SECRET are configured.</Trans>
					</div>
				) : null}

				<div className="grid gap-5 rounded-md border bg-card p-5">
					<div className="space-y-2">
						<Label>
							<Trans>Provider and model</Trans>
						</Label>
						<Combobox
							value={aiProviderId}
							options={providerOptions}
							disabled={isLoadingProviders || providerOptions.length === 0}
							placeholder={isLoadingProviders ? t`Loading providers...` : t`Select a tested provider`}
							onValueChange={setAiProviderId}
						/>
						{providerOptions.length === 0 && !isLoadingProviders ? (
							<div className="flex items-center justify-between gap-3 rounded-md border border-dashed p-3 text-sm">
								<span className="text-muted-foreground">
									<Trans>Add and test a provider before starting a thread.</Trans>
								</span>
								<Button
									size="sm"
									variant="outline"
									nativeButton={false}
									render={<Link to="/dashboard/settings/integrations" />}
								>
									<GearSixIcon />
									<Trans>Settings</Trans>
								</Button>
							</div>
						) : null}
					</div>

					<div className="space-y-2">
						<Label>
							<Trans>Resume</Trans>
						</Label>
						<Combobox
							value={selectedResumeValue}
							showClear={false}
							options={resumeOptions}
							disabled={isLoadingResumes}
							placeholder={isLoadingResumes ? t`Loading resumes...` : t`Choose a resume`}
							onValueChange={(value) => setSourceResumeId(value && value !== "__scratch__" ? value : null)}
						/>
						<div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
							<Badge variant="secondary">
								<FilePlusIcon />
								{sourceResumeId ? <Trans>Duplicate as AI Draft</Trans> : <Trans>Blank draft</Trans>}
							</Badge>
							<span>
								<Trans>The agent edits a new draft, not the original resume.</Trans>
							</span>
						</div>
					</div>

					<div className="flex justify-end">
						<Button
							disabled={!canCreate || isPending}
							onClick={() =>
								createThread(
									{
										...(aiProviderId ? { aiProviderId } : {}),
										...(sourceResumeId ? { sourceResumeId } : {}),
									},
									{
										onSuccess: (thread) => {
											void navigate({ to: "/agent/$threadId", params: { threadId: thread.id } });
										},
										onError: (error) =>
											toast.error(
												getOrpcErrorMessage(error, {
													byCode: {
														PRECONDITION_FAILED: t`AI agent setup is unavailable until REDIS_URL and ENCRYPTION_SECRET are configured.`,
														BAD_REQUEST: t`Select a tested provider before starting a thread.`,
													},
													fallback: t`Failed to start agent thread.`,
												}),
											),
									},
								)
							}
						>
							{isPending ? <Spinner /> : <ArrowRightIcon />}
							<Trans>Start Thread</Trans>
						</Button>
					</div>
				</div>
			</main>
		</div>
	);
}
