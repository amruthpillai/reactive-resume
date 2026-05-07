import type { AIProvider } from "@reactive-resume/ai/types";
import type { ComboboxOption } from "@/components/ui/combobox";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CheckCircleIcon, InfoIcon, XCircleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { useAIStore } from "@reactive-resume/ai/store";
import { AI_PROVIDER_DEFAULT_BASE_URLS } from "@reactive-resume/ai/types";
import { Button } from "@reactive-resume/ui/components/button";
import { Input } from "@reactive-resume/ui/components/input";
import { Label } from "@reactive-resume/ui/components/label";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { Switch } from "@reactive-resume/ui/components/switch";
import { cn } from "@reactive-resume/utils/style";
import { Combobox } from "@/components/ui/combobox";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

type AIProviderOption = ComboboxOption<AIProvider> & { defaultBaseURL: string };

const providerOptions: AIProviderOption[] = [
	{
		value: "openai",
		label: t({
			comment: "AI provider option label in dashboard AI settings",
			message: "OpenAI",
		}),
		keywords: ["openai", "gpt", "chatgpt"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.openai,
	},
	{
		value: "anthropic",
		label: t({
			comment: "AI provider option label in dashboard AI settings",
			message: "Anthropic Claude",
		}),
		keywords: ["anthropic", "claude", "ai"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.anthropic,
	},
	{
		value: "gemini",
		label: t({
			comment: "AI provider option label in dashboard AI settings",
			message: "Google Gemini",
		}),
		keywords: ["gemini", "google", "bard"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.gemini,
	},
	{
		value: "vercel-ai-gateway",
		label: t({
			comment: "AI provider option label in dashboard AI settings",
			message: "Vercel AI Gateway",
		}),
		keywords: ["vercel", "gateway", "ai"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS["vercel-ai-gateway"],
	},
	{
		value: "openrouter",
		label: t({
			comment: "AI provider option label in dashboard AI settings",
			message: "OpenRouter",
		}),
		keywords: ["openrouter", "router", "multi", "proxy"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.openrouter,
	},
	{
		value: "ollama",
		label: t({
			comment: "AI provider option label in dashboard AI settings",
			message: "Ollama",
		}),
		keywords: ["ollama", "ai", "local"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.ollama,
	},
];

function isValidOptionalBaseURL(value: string) {
	const trimmedValue = value.trim();
	if (!trimmedValue) return true;

	try {
		return new URL(trimmedValue).protocol === "https:";
	} catch {
		return false;
	}
}

function AIForm() {
	const { set, model, apiKey, baseURL, provider, enabled, testStatus } = useAIStore();

	const selectedOption = useMemo(() => {
		return providerOptions.find((option) => option.value === provider);
	}, [provider]);

	const canTestConnection = model.trim().length > 0 && apiKey.trim().length > 0 && isValidOptionalBaseURL(baseURL);

	const { mutate: testConnection, isPending: isTesting } = useMutation(orpc.ai.testConnection.mutationOptions());

	const handleProviderChange = (value: AIProvider | null) => {
		if (!value) return;

		set((draft) => {
			draft.provider = value;
		});
	};

	const handleTestConnection = () => {
		if (!canTestConnection) return;

		testConnection(
			{ provider, model: model.trim(), apiKey: apiKey.trim(), baseURL: baseURL.trim() },
			{
				onSuccess: (data) => {
					set((draft) => {
						draft.testStatus = data ? "success" : "failure";
					});
				},
				onError: (error) => {
					set((draft) => {
						draft.testStatus = "failure";
					});

					toast.error(
						getOrpcErrorMessage(error, {
							byCode: {
								BAD_REQUEST: t({
									comment: "Error shown when AI provider credentials or base URL are invalid in AI settings",
									message: "Invalid AI provider configuration. Please check your settings.",
								}),
								BAD_GATEWAY: t({
									comment: "Error shown when the configured AI provider cannot be reached during connection test",
									message: "Could not reach the AI provider. Please try again.",
								}),
							},
							fallback: t({
								comment: "Fallback toast when testing AI provider connection fails",
								message: "Failed to test AI provider connection. Please try again.",
							}),
						}),
					);
				},
			},
		);
	};

	return (
		<div className="grid gap-6 sm:grid-cols-2">
			<div className="flex flex-col gap-y-2">
				<Label htmlFor="ai-provider">
					<Trans>Provider</Trans>
				</Label>
				<Combobox
					id="ai-provider"
					value={provider}
					disabled={enabled}
					options={providerOptions}
					onValueChange={handleProviderChange}
				/>
			</div>

			<div className="flex flex-col gap-y-2">
				<Label htmlFor="ai-model">
					<Trans>Model</Trans>
				</Label>
				<Input
					id="ai-model"
					name="ai-model"
					type="text"
					value={model}
					disabled={enabled}
					onChange={(e) =>
						set((draft) => {
							draft.model = e.target.value;
						})
					}
					placeholder={t({
						comment: "Example model-name placeholder in AI settings",
						message: "e.g., gpt-4, claude-3-opus, gemini-pro",
					})}
					autoCorrect="off"
					autoComplete="off"
					spellCheck="false"
					autoCapitalize="off"
				/>
			</div>

			<div className="flex flex-col gap-y-2 sm:col-span-2">
				<Label htmlFor="ai-api-key">
					<Trans>API Key</Trans>
				</Label>
				<Input
					id="ai-api-key"
					name="ai-api-key"
					type="password"
					value={apiKey}
					disabled={enabled}
					onChange={(e) =>
						set((draft) => {
							draft.apiKey = e.target.value;
						})
					}
					autoCorrect="off"
					autoComplete="off"
					spellCheck="false"
					autoCapitalize="off"
					data-lpignore="true"
					data-bwignore="true"
					data-1p-ignore="true"
				/>
			</div>

			<div className="flex flex-col gap-y-2 sm:col-span-2">
				<Label htmlFor="ai-base-url">
					<Trans>Base URL (Optional)</Trans>
				</Label>
				<Input
					id="ai-base-url"
					name="ai-base-url"
					type="url"
					value={baseURL}
					disabled={enabled}
					placeholder={selectedOption?.defaultBaseURL}
					onChange={(e) =>
						set((draft) => {
							draft.baseURL = e.target.value;
						})
					}
					autoCorrect="off"
					autoComplete="off"
					spellCheck="false"
					autoCapitalize="off"
				/>
			</div>

			<div>
				<Button variant="outline" disabled={isTesting || enabled || !canTestConnection} onClick={handleTestConnection}>
					{isTesting ? (
						<Spinner />
					) : testStatus === "success" ? (
						<CheckCircleIcon className="text-success" />
					) : testStatus === "failure" ? (
						<XCircleIcon className="text-destructive" />
					) : null}
					<Trans>Test Connection</Trans>
				</Button>
			</div>
		</div>
	);
}

export function AISettingsSection() {
	const aiEnabled = useAIStore((state) => state.enabled);
	const canEnableAI = useAIStore((state) => state.canEnable());
	const setAIEnabled = useAIStore((state) => state.setEnabled);

	return (
		<section className="grid gap-6">
			<h2 className="font-semibold text-lg">
				<Trans>Artificial Intelligence</Trans>
			</h2>

			<div className="flex items-start gap-4 rounded-md border bg-popover p-6">
				<div className="rounded-md bg-primary/10 p-2.5">
					<InfoIcon className="text-primary" size={24} />
				</div>

				<div className="flex-1 space-y-2">
					<h3 className="font-semibold">
						<Trans>Your data is stored locally</Trans>
					</h3>

					<p className="text-muted-foreground leading-relaxed">
						<Trans>
							Everything entered here is stored locally on your browser. Your data is only sent to the server when
							making a request to the AI provider, and is never stored or logged on our servers.
						</Trans>
					</p>
				</div>
			</div>

			<div className="flex items-center justify-between">
				<Label htmlFor="enable-ai">
					<Trans>Enable AI Features</Trans>
				</Label>
				<Switch id="enable-ai" checked={aiEnabled} disabled={!canEnableAI} onCheckedChange={setAIEnabled} />
			</div>

			<p className={cn("flex items-center gap-x-2", aiEnabled ? "text-success" : "text-destructive")}>
				{aiEnabled ? <CheckCircleIcon /> : <XCircleIcon />}
				{aiEnabled ? <Trans>Enabled</Trans> : <Trans>Disabled</Trans>}
			</p>

			<AIForm />
		</section>
	);
}
