import { BrainIcon, CheckCircleIcon, InfoIcon, XCircleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMemo } from "react";
import { toast } from "sonner";
import { useIsClient } from "usehooks-ts";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { type AIProvider, useAIStore } from "@/integrations/ai/store";
import { orpc } from "@/integrations/orpc/client";
import { cn } from "@/utils/style";
import { DashboardHeader } from "../-components/header";

export const Route = createFileRoute("/dashboard/settings/ai")({
	component: RouteComponent,
});

const providerOptions: (ComboboxOption<AIProvider> & { defaultBaseURL: string })[] = [
	{
		value: "openai",
		label: "OpenAI",
		keywords: ["openai", "gpt", "chatgpt"],
		defaultBaseURL: "https://api.openai.com/v1",
	},
	{
		value: "ollama",
		label: "Ollama",
		keywords: ["ollama", "ai", "local"],
		defaultBaseURL: "http://localhost:11434",
	},
	{
		value: "anthropic",
		label: "Anthropic Claude",
		keywords: ["anthropic", "claude", "ai"],
		defaultBaseURL: "https://api.anthropic.com/v1",
	},
	{
		value: "vercel-ai-gateway",
		label: "Vercel AI Gateway",
		keywords: ["vercel", "gateway", "ai"],
		defaultBaseURL: "https://ai-gateway.vercel.sh/v1/ai",
	},
	{
		value: "gemini",
		label: "Google Gemini",
		keywords: ["gemini", "google", "bard"],
		defaultBaseURL: "https://generativelanguage.googleapis.com/v1beta",
	},
];

function AIForm() {
	const { set, model, apiKey, baseURL, provider, enabled, testStatus } = useAIStore();

	const selectedOption = useMemo(() => {
		return providerOptions.find((option) => option.value === provider);
	}, [provider]);

	const { mutate: testConnection, isPending: isTesting } = useMutation(orpc.ai.testConnection.mutationOptions());

	const handleProviderChange = (value: AIProvider | null) => {
		if (!value) return;
		set((draft) => {
			draft.provider = value;
		});
	};

	const handleModelChange = (value: string) => {
		set((draft) => {
			draft.model = value;
		});
	};

	const handleApiKeyChange = (value: string) => {
		set((draft) => {
			draft.apiKey = value;
		});
	};

	const handleBaseURLChange = (value: string) => {
		set((draft) => {
			draft.baseURL = value;
		});
	};

	const handleTestConnection = () => {
		testConnection(
			{ provider, model, apiKey, baseURL },
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

					toast.error(error.message);
				},
			},
		);
	};

	return (
		<div className="grid gap-6 sm:grid-cols-2">
			<div className="flex flex-col gap-y-2">
				<Label htmlFor="ai-provider">
					Provider
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
					Model
				</Label>
				<Input
					id="ai-model"
					name="ai-model"
					type="text"
					value={model}
					disabled={enabled}
					onChange={(e) => handleModelChange(e.target.value)}
					placeholder="e.g., gpt-4, claude-3-opus, gemini-pro"
					autoCorrect="off"
					autoComplete="off"
					spellCheck="false"
					autoCapitalize="off"
				/>
			</div>

			<div className="flex flex-col gap-y-2 sm:col-span-2">
				<Label htmlFor="ai-api-key">
					API Key
				</Label>
				<Input
					id="ai-api-key"
					name="ai-api-key"
					type="password"
					value={apiKey}
					disabled={enabled}
					onChange={(e) => handleApiKeyChange(e.target.value)}
					autoCorrect="off"
					autoComplete="off"
					spellCheck="false"
					autoCapitalize="off"
					// ignore password managers
					data-lpignore="true"
					data-bwignore="true"
					data-1p-ignore="true"
				/>
			</div>

			<div className="flex flex-col gap-y-2 sm:col-span-2">
				<Label htmlFor="ai-base-url">
					Base URL (Optional)
				</Label>
				<Input
					id="ai-base-url"
					name="ai-base-url"
					type="url"
					value={baseURL}
					disabled={enabled}
					placeholder={selectedOption?.defaultBaseURL}
					onChange={(e) => handleBaseURLChange(e.target.value)}
					autoCorrect="off"
					autoComplete="off"
					spellCheck="false"
					autoCapitalize="off"
				/>
			</div>

			<div>
				<Button variant="outline" disabled={isTesting || enabled} onClick={handleTestConnection}>
					{isTesting ? (
						<Spinner />
					) : testStatus === "success" ? (
						<CheckCircleIcon className="text-success" />
					) : testStatus === "failure" ? (
						<XCircleIcon className="text-destructive" />
					) : null}
					Test Connection
				</Button>
			</div>
		</div>
	);
}

function RouteComponent() {
	const isClient = useIsClient();

	const enabled = useAIStore((state) => state.enabled);
	const canEnable = useAIStore((state) => state.canEnable());
	const setEnabled = useAIStore((state) => state.setEnabled);

	if (!isClient) return null;

	return (
		<div className="space-y-4">
			<DashboardHeader icon={BrainIcon} title={"Artificial Intelligence"} />

			<Separator />

			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className="grid max-w-xl gap-6"
			>
				<div className="flex items-start gap-4 rounded-sm border bg-popover p-6">
					<div className="rounded-sm bg-primary/10 p-2.5">
						<InfoIcon className="text-primary" size={24} />
					</div>

					<div className="flex-1 space-y-2">
						<h3 className="font-semibold">
							Your data is stored locally
						</h3>

						<p className="text-muted-foreground leading-relaxed">
							Everything entered here is stored locally on your browser. Your data is only sent to the server when
								making a request to the AI provider, and is never stored or logged on our servers.
						</p>
					</div>
				</div>

				<Separator />

				<div className="flex items-center justify-between">
					<Label htmlFor="enable-ai">
						Enable AI Features
					</Label>
					<Switch id="enable-ai" checked={enabled} disabled={!canEnable} onCheckedChange={setEnabled} />
				</div>

				<p className={cn("flex items-center gap-x-2", enabled ? "text-success" : "text-destructive")}>
					{enabled ? <CheckCircleIcon /> : <XCircleIcon />}
					{enabled ? Enabled : Disabled}
				</p>

				<AIForm />
			</motion.div>
		</div>
	);
}
