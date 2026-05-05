import type { AIObservabilityInput } from "@/integrations/ai/observability";
import type { AIProvider } from "@/integrations/ai/types";

export function buildAIObservabilityMetadata(
  input: {
    provider: AIProvider;
    model: string;
    baseURL: string;
    observability?: AIObservabilityInput;
  },
  extra: Record<string, unknown> = {},
) {
  return {
    provider: input.provider,
    model: input.model,
    hasCustomBaseUrl: input.baseURL.trim().length > 0,
    observabilityEnabled: input.observability?.enabled ?? false,
    observabilityProvider: input.observability?.provider,
    ...extra,
  };
}
