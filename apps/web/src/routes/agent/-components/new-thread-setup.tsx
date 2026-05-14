import type { AIProvider } from "@reactive-resume/ai/types";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon, ChatCircleDotsIcon, FilePlusIcon, GearSixIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useIsClient } from "usehooks-ts";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { Label } from "@reactive-resume/ui/components/label";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { Combobox } from "@/components/ui/combobox";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

function providerLabel(provider: { label: string; provider: AIProvider; model: string }) {
	return `${provider.label} · ${provider.provider} · ${provider.model}`;
}

function isAgentConfigError(error: unknown) {
	if (!error || typeof error !== "object") return false;
	const message = (error as { message?: unknown }).message;
	const status = (error as { status?: unknown; code?: unknown }).status ?? (error as { code?: unknown }).code;
	if (status === "PRECONDITION_FAILED" || status === 412) return true;
	return typeof message === "string" && /REDIS_URL|ENCRYPTION_SECRET/.test(message);
}

export function NewThreadSetup({ resumeId }: { resumeId?: string }) {
	const isClient = useIsClient();
	const navigate = useNavigate();
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

	if (!isClient) return null;

	return (
		<div className="mx-auto grid w-full max-w-4xl gap-6 self-center p-4 lg:p-6">
			<div className="flex items-start gap-4">
				<div className="grid size-12 shrink-0 place-items-center rounded-md border bg-card shadow-sm lg:size-14">
					<ChatCircleDotsIcon className="size-6 text-foreground" weight="fill" />
				</div>
				<div className="min-w-0">
					<h1 className="font-semibold text-3xl tracking-tight lg:text-4xl">
						<Trans>Start a thread</Trans>
					</h1>
					<p className="mt-1 text-muted-foreground">
						<Trans>Choose a model and resume draft.</Trans>
					</p>
				</div>
			</div>

			{providersError ? (
				<div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950 text-sm dark:bg-amber-950/20 dark:text-amber-200">
					{isAgentConfigError(providersError) ? (
						<Trans>AI agent setup is unavailable until REDIS_URL and ENCRYPTION_SECRET are configured.</Trans>
					) : (
						<Trans>AI agent setup is unavailable right now. Please try again in a moment.</Trans>
					)}
				</div>
			) : null}

			<div className="rounded-md border bg-card p-4 shadow-sm lg:p-6">
				<div className="grid gap-x-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
					<div className="relative isolate min-h-32 overflow-hidden rounded-md p-1 lg:p-2">
						<span
							aria-hidden="true"
							className="pointer-events-none absolute -top-7 right-1 -z-10 select-none font-black text-8xl text-foreground/[0.045] leading-none lg:-top-10 lg:right-3 lg:text-[8rem]"
						>
							1
						</span>
						<div className="space-y-3">
							<Label>
								<Trans>Select an agent model</Trans>
							</Label>
							<Combobox
								value={aiProviderId}
								options={providerOptions}
								disabled={isLoadingProviders || providerOptions.length === 0}
								placeholder={isLoadingProviders ? t`Loading providers...` : t`Select a tested provider`}
								onValueChange={setAiProviderId}
							/>
							{providerOptions.length === 0 && !isLoadingProviders ? (
								<div className="flex flex-col gap-3 rounded-md border border-dashed p-3 text-sm lg:flex-row lg:items-center lg:justify-between">
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
					</div>

					<div className="relative isolate min-h-32 overflow-hidden rounded-md p-1 lg:p-2">
						<span
							aria-hidden="true"
							className="pointer-events-none absolute -top-7 right-1 -z-10 select-none font-black text-8xl text-foreground/[0.045] leading-none lg:-top-10 lg:right-3 lg:text-[8rem]"
						>
							2
						</span>
						<div className="space-y-3">
							<Label>
								<Trans>Select a resume</Trans>
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
								<Badge variant="secondary" className="h-7 gap-1.5 rounded-md px-2">
									<FilePlusIcon />
									{sourceResumeId ? <Trans>Duplicate as AI Draft</Trans> : <Trans>Blank draft</Trans>}
								</Badge>
							</div>
						</div>
					</div>
				</div>

				<div className="mt-2 flex border-t pt-5 lg:justify-end">
					<Button
						size="lg"
						className="h-11 w-full gap-2 px-5 lg:w-auto"
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
						<Trans>Start Thread</Trans>
						{isPending ? <Spinner /> : <ArrowRightIcon />}
					</Button>
				</div>
			</div>
		</div>
	);
}
