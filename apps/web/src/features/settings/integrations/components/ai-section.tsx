import type { AIProvider } from "@reactive-resume/ai/types";
import type { ComboboxOption } from "@/components/ui/combobox";
import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ORPCError } from "@orpc/client";
import { CheckCircleIcon, KeyIcon, PlusIcon, TrashIcon, WarningCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AI_PROVIDER_DEFAULT_BASE_URLS } from "@reactive-resume/ai/types";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { Input } from "@reactive-resume/ui/components/input";
import { Label } from "@reactive-resume/ui/components/label";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { Switch } from "@reactive-resume/ui/components/switch";
import { cn } from "@reactive-resume/utils/style";
import { Combobox } from "@/components/ui/combobox";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

type SavedProvider = RouterOutput["aiProviders"]["list"][number];
type AIProviderOption = ComboboxOption<AIProvider> & { defaultBaseURL: string };

const providerOptions: AIProviderOption[] = [
	{
		value: "openai",
		label: t`OpenAI`,
		keywords: ["openai", "gpt", "chatgpt"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.openai,
	},
	{
		value: "anthropic",
		label: t`Anthropic Claude`,
		keywords: ["anthropic", "claude", "ai"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.anthropic,
	},
	{
		value: "gemini",
		label: t`Google Gemini`,
		keywords: ["gemini", "google"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.gemini,
	},
	{
		value: "vercel-ai-gateway",
		label: t`Vercel AI Gateway`,
		keywords: ["vercel", "gateway", "ai"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS["vercel-ai-gateway"],
	},
	{
		value: "openrouter",
		label: t`OpenRouter`,
		keywords: ["openrouter", "router"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.openrouter,
	},
	{
		value: "ollama",
		label: t`Ollama`,
		keywords: ["ollama", "local"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.ollama,
	},
	{
		value: "openai-compatible",
		label: t`OpenAI-compatible`,
		keywords: ["compatible", "custom", "gateway"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS["openai-compatible"],
	},
];

const emptyForm = {
	label: "",
	provider: "openai" as AIProvider,
	model: "",
	baseURL: "",
	apiKey: "",
};

function statusBadge(provider: SavedProvider) {
	if (provider.testStatus === "success") {
		return (
			<Badge className="bg-emerald-600 text-white">
				<Trans>Tested</Trans>
			</Badge>
		);
	}
	if (provider.testStatus === "failure") {
		return (
			<Badge variant="destructive">
				<Trans>Failed</Trans>
			</Badge>
		);
	}
	return (
		<Badge variant="secondary">
			<Trans>Untested</Trans>
		</Badge>
	);
}

function providerLabel(provider: AIProvider) {
	return providerOptions.find((option) => option.value === provider)?.label ?? provider;
}

function isAiProviderConfigError(error: unknown) {
	if (error instanceof ORPCError && error.code === "PRECONDITION_FAILED") return true;

	if (!error || typeof error !== "object") return false;
	const status = (error as { status?: unknown; code?: unknown }).status ?? (error as { code?: unknown }).code;
	return status === "PRECONDITION_FAILED" || status === 412;
}

function ProviderRow({ provider }: { provider: SavedProvider }) {
	const queryClient = useQueryClient();
	const invalidate = () => queryClient.invalidateQueries({ queryKey: orpc.aiProviders.list.queryKey() });
	const { mutate: testProvider, isPending: isTesting } = useMutation(orpc.aiProviders.test.mutationOptions());
	const { mutate: updateProvider, isPending: isUpdating } = useMutation(orpc.aiProviders.update.mutationOptions());
	const { mutate: deleteProvider, isPending: isDeleting } = useMutation(orpc.aiProviders.delete.mutationOptions());
	const isMutating = isTesting || isUpdating || isDeleting;

	return (
		<div className="grid gap-4 rounded-md border bg-card p-4 md:grid-cols-[1fr_auto]">
			<div className="min-w-0 space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<h3 className="truncate font-semibold">{provider.label}</h3>
					{statusBadge(provider)}
					{provider.enabled ? (
						<Badge variant="outline">
							<Trans>Enabled</Trans>
						</Badge>
					) : null}
				</div>

				<div className="grid gap-1 text-muted-foreground text-sm">
					<p>
						{providerLabel(provider.provider)} · {provider.model}
					</p>
					<p className="truncate">{provider.baseURL ?? AI_PROVIDER_DEFAULT_BASE_URLS[provider.provider]}</p>
					<p>
						<Trans>Key</Trans>: {provider.apiKeyPreview}
					</p>
					{provider.testError ? <p className="text-rose-600">{provider.testError}</p> : null}
				</div>
			</div>

			<div className="flex items-center gap-2 md:justify-end">
				<div className="flex items-center gap-2 pe-2">
					<Switch
						checked={provider.enabled}
						disabled={provider.testStatus !== "success" || isMutating}
						onCheckedChange={(enabled) =>
							updateProvider(
								{ id: provider.id, enabled },
								{
									onSuccess: () => void invalidate(),
									onError: (error) =>
										toast.error(getOrpcErrorMessage(error, { fallback: t`Failed to update provider.` })),
								},
							)
						}
					/>
					<span className="text-muted-foreground text-sm">
						<Trans>Use</Trans>
					</span>
				</div>

				<Button
					variant="outline"
					disabled={isMutating}
					onClick={() =>
						testProvider(
							{ id: provider.id },
							{
								onSuccess: (response) => {
									if (response.testStatus === "success") {
										toast.success(t`Provider connection verified.`);
									} else {
										toast.error(response.testError ?? t`Could not verify provider connection.`);
									}
									void invalidate();
								},
								onError: (error) => {
									toast.error(getOrpcErrorMessage(error, { fallback: t`Could not verify provider connection.` }));
									void invalidate();
								},
							},
						)
					}
				>
					{isTesting ? <Spinner /> : provider.testStatus === "success" ? <CheckCircleIcon /> : <WarningCircleIcon />}
					<Trans>Test</Trans>
				</Button>

				<Button
					size="icon"
					variant="ghost"
					disabled={isMutating}
					onClick={() =>
						deleteProvider(
							{ id: provider.id },
							{
								onSuccess: () => void invalidate(),
								onError: (error) =>
									toast.error(getOrpcErrorMessage(error, { fallback: t`Failed to delete provider.` })),
							},
						)
					}
				>
					<TrashIcon />
					<span className="sr-only">
						<Trans>Delete provider</Trans>
					</span>
				</Button>
			</div>
		</div>
	);
}

function CreateProviderForm() {
	const queryClient = useQueryClient();
	const [form, setForm] = useState(emptyForm);
	const selectedOption = useMemo(
		() => providerOptions.find((option) => option.value === form.provider),
		[form.provider],
	);
	const canCreate = form.label.trim() && form.model.trim() && form.apiKey.trim();
	const { mutate: createProvider, isPending } = useMutation(orpc.aiProviders.create.mutationOptions());

	return (
		<div className="rounded-md border bg-card p-4">
			<div className="mb-4 flex items-center gap-2">
				<div className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
					<PlusIcon />
				</div>
				<h3 className="font-semibold">
					<Trans>Add Provider</Trans>
				</h3>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="ai-label">
						<Trans>Label</Trans>
					</Label>
					<Input
						id="ai-label"
						value={form.label}
						onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
						placeholder={t`Work OpenAI`}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="ai-provider">
						<Trans>Provider</Trans>
					</Label>
					<Combobox
						id="ai-provider"
						value={form.provider}
						showClear={false}
						options={providerOptions}
						onValueChange={(provider) => {
							if (!provider) return;
							setForm((current) => ({ ...current, provider }));
						}}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="ai-model">
						<Trans>Model</Trans>
					</Label>
					<Input
						id="ai-model"
						value={form.model}
						onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
						placeholder={t`gpt-4.1`}
						autoCorrect="off"
						autoCapitalize="off"
						spellCheck="false"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="ai-base-url">
						<Trans>Base URL</Trans>
					</Label>
					<Input
						id="ai-base-url"
						type="url"
						value={form.baseURL}
						onChange={(event) => setForm((current) => ({ ...current, baseURL: event.target.value }))}
						placeholder={selectedOption?.defaultBaseURL || t`https://gateway.example.com/v1`}
						autoCorrect="off"
						autoCapitalize="off"
						spellCheck="false"
					/>
				</div>

				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="ai-api-key">
						<Trans>API Key</Trans>
					</Label>
					<Input
						id="ai-api-key"
						type="password"
						value={form.apiKey}
						onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))}
						autoCorrect="off"
						autoCapitalize="off"
						spellCheck="false"
						data-lpignore="true"
						data-bwignore="true"
						data-1p-ignore="true"
					/>
				</div>
			</div>

			<div className="mt-4 flex justify-end">
				<Button
					disabled={!canCreate || isPending}
					onClick={() =>
						createProvider(
							{
								label: form.label.trim(),
								provider: form.provider,
								model: form.model.trim(),
								baseURL: form.baseURL.trim(),
								apiKey: form.apiKey.trim(),
							},
							{
								onSuccess: () => {
									setForm(emptyForm);
									toast.success(t`AI provider saved. Test it before use.`);
									void queryClient.invalidateQueries({ queryKey: orpc.aiProviders.list.queryKey() });
								},
								onError: (error) =>
									toast.error(
										getOrpcErrorMessage(error, {
											byCode: {
												PRECONDITION_FAILED: t`AI providers require REDIS_URL and ENCRYPTION_SECRET to be configured.`,
												BAD_REQUEST: t`Invalid AI provider configuration.`,
											},
											fallback: t`Failed to save AI provider.`,
										}),
									),
							},
						)
					}
				>
					{isPending ? <Spinner /> : <KeyIcon />}
					<Trans>Save Provider</Trans>
				</Button>
			</div>
		</div>
	);
}

export function AISettingsSection() {
	const { data: providers, isLoading, error } = useQuery(orpc.aiProviders.list.queryOptions());
	const hasUsableProvider = providers?.some((provider) => provider.enabled && provider.testStatus === "success");
	const isConfigError = isAiProviderConfigError(error);

	return (
		<section className="grid gap-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h2 className="font-semibold text-lg">
						<Trans>AI Providers</Trans>
					</h2>
					<p className="text-muted-foreground text-sm">
						<Trans>API keys are encrypted on the server and never shown again after saving.</Trans>
					</p>
				</div>

				<p className="flex items-center gap-2 text-sm">
					{hasUsableProvider ? (
						<CheckCircleIcon className="text-emerald-600" />
					) : (
						<XCircleIcon className="text-rose-600" />
					)}
					<span className={cn(hasUsableProvider ? "text-emerald-700" : "text-muted-foreground")}>
						{hasUsableProvider ? <Trans>Agent ready</Trans> : <Trans>No tested provider</Trans>}
					</span>
				</p>
			</div>

			{error ? (
				<div
					className={cn(
						"rounded-md border p-4 text-sm",
						isConfigError
							? "border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950/20 dark:text-amber-200"
							: "border-rose-300 bg-rose-50 text-rose-950 dark:bg-rose-950/20 dark:text-rose-200",
					)}
				>
					{isConfigError ? (
						<Trans>AI provider management is unavailable until REDIS_URL and ENCRYPTION_SECRET are configured.</Trans>
					) : (
						<Trans>AI provider management is unavailable. Please try again.</Trans>
					)}
				</div>
			) : null}

			{error ? null : <CreateProviderForm />}

			<div className="grid gap-3">
				{isLoading ? (
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<Spinner />
						<Trans>Loading providers...</Trans>
					</div>
				) : null}

				{providers?.length === 0 ? (
					<div className="rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
						<Trans>Add and test a provider before starting an agent thread.</Trans>
					</div>
				) : null}

				{providers?.map((provider) => (
					<ProviderRow key={provider.id} provider={provider} />
				))}
			</div>
		</section>
	);
}
