import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { BrainIcon, CheckCircleIcon, InfoIcon, XCircleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useIsClient } from "usehooks-ts";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { type AIProvider, useAIStore } from "@/integrations/ai/store";
import { client } from "@/integrations/orpc/client";
import { cn } from "@/utils/style";
import { DashboardHeader } from "../-components/header";

export const Route = createFileRoute("/dashboard/settings/ai")({
	component: RouteComponent,
});

const providerOptions: ComboboxOption<AIProvider>[] = [
	{ value: "vercel-ai-gateway", label: "Vercel AI Gateway", keywords: ["vercel", "gateway", "ai"] },
	{ value: "openai", label: "OpenAI", keywords: ["openai", "gpt", "chatgpt"] },
	{ value: "gemini", label: "Google Gemini", keywords: ["gemini", "google", "bard"] },
	{ value: "anthropic", label: "Anthropic Claude", keywords: ["anthropic", "claude", "ai"] },
	{ value: "ollama", label: "Ollama", keywords: ["ollama", "ai", "local"] },
];

function AIForm() {
	const { set, model, apiKey, baseURL, provider, enabled, testStatus } = useAIStore();

	const { mutate: testConnection, isPending: isTesting } = useMutation({
		mutationFn: async () => {
			if (testStatus === "success") return;
			const stream = await client.ai.testConnection({ provider, model, apiKey, baseURL });
			let result = "";
			for await (const chunk of stream) {
				result += chunk;
			}
			set((draft) => {
				draft.testStatus = result === "1" ? "success" : "failure";
			});
		},
	});

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

	return (
		<div className="grid gap-6 sm:grid-cols-2">
			<div className="flex flex-col gap-y-2">
				<Label htmlFor="provider">
					<Trans>Provider</Trans>
				</Label>
				<Combobox
					id="provider"
					value={provider}
					disabled={enabled}
					options={providerOptions}
					onValueChange={handleProviderChange}
				/>
			</div>

			<div className="flex flex-col gap-y-2">
				<Label htmlFor="model">
					<Trans>Model</Trans>
				</Label>
				<Input
					id="model"
					type="text"
					value={model}
					disabled={enabled}
					onChange={(e) => handleModelChange(e.target.value)}
					placeholder="e.g., gpt-4, claude-3-opus, gemini-pro"
				/>
			</div>

			<div className="flex flex-col gap-y-2 sm:col-span-2">
				<Label htmlFor="api-key">
					<Trans>API Key</Trans>
				</Label>
				<Input
					id="api-key"
					type="password"
					value={apiKey}
					disabled={enabled}
					onChange={(e) => handleApiKeyChange(e.target.value)}
				/>
			</div>

			{provider === "ollama" && (
				<div className="flex flex-col gap-y-2 sm:col-span-2">
					<Label htmlFor="base-url">
						<Trans>Base URL (Optional)</Trans>
					</Label>
					<Input
						id="base-url"
						type="url"
						value={baseURL}
						disabled={enabled}
						placeholder="http://localhost:11434"
						onChange={(e) => handleBaseURLChange(e.target.value)}
					/>
				</div>
			)}

			<div>
				<Button variant="outline" disabled={isTesting || enabled} onClick={() => testConnection()}>
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

function RouteComponent() {
	const isClient = useIsClient();

	const enabled = useAIStore((state) => state.enabled);
	const canEnable = useAIStore((state) => state.canEnable());
	const setEnabled = useAIStore((state) => state.setEnabled);

	if (!isClient) return null;

	return (
		<div className="space-y-4">
			<DashboardHeader icon={BrainIcon} title={t`Artificial Intelligence`} />

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

				<Separator />

				<div className="flex items-center justify-between">
					<Label htmlFor="enable-ai">
						<Trans>Enable AI Features</Trans>
					</Label>
					<Switch id="enable-ai" checked={enabled} disabled={!canEnable} onCheckedChange={setEnabled} />
				</div>

				<p className={cn("flex items-center gap-x-2", enabled ? "text-success" : "text-destructive")}>
					{enabled ? <CheckCircleIcon /> : <XCircleIcon />}
					{enabled ? <Trans>Enabled</Trans> : <Trans>Disabled</Trans>}
				</p>

				<AIForm />
			</motion.div>
		</div>
	);
}
