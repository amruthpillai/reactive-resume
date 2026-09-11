import type { AIProvider } from "@reactive-resume/ai/types";
import { t } from "@lingui/core/macro";
import { Combobox } from "@/components/ui/combobox";

export type UsableAiProvider = {
	id: string;
	label: string;
	provider: AIProvider;
	model: string;
};

/** Two accounts on the same provider are only told apart by their label, so all three are shown. */
function aiProviderLabel(provider: UsableAiProvider) {
	return `${provider.label} · ${provider.provider} · ${provider.model}`;
}

type AiProviderPickerProps = {
	value: string | null;
	providers: readonly UsableAiProvider[];
	isLoading?: boolean;
	disabled?: boolean;
	onValueChange: (value: string | null) => void;
};

export function AiProviderPicker({ value, providers, isLoading, disabled, onValueChange }: AiProviderPickerProps) {
	const options = providers.map((provider) => ({
		value: provider.id,
		label: aiProviderLabel(provider),
		keywords: [provider.label, provider.provider, provider.model],
	}));

	return (
		<Combobox
			value={value}
			options={options}
			disabled={disabled || isLoading || options.length === 0}
			placeholder={isLoading ? t`Loading providers…` : t`Select an AI provider`}
			onValueChange={onValueChange}
		/>
	);
}
