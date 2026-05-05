import { match } from "ts-pattern";

import type { AIProvider } from "@/integrations/ai/types";

import type { AIObservabilityInput, AIObservabilityTelemetry } from "./types";

import { withLaminarObservability } from "./providers/laminar";
import { withLangSmithObservability } from "./providers/langsmith";

export { aiObservabilitySchema, aiObservabilityProviderSchema } from "./types";
export { buildAIObservabilityMetadata } from "./metadata";
export type { AIObservabilityInput, AIObservabilityProvider } from "./types";

type WithAIObservabilityInput = {
  observability?: AIObservabilityInput;
  modelProvider: AIProvider;
  operationName: string;
  metadata: Record<string, unknown>;
};

export async function withAIObservability<T>(
  input: WithAIObservabilityInput,
  execute: (telemetry: AIObservabilityTelemetry | undefined) => Promise<T>,
): Promise<T> {
  if (!input.observability?.enabled) return execute(undefined);

  return match(input.observability.provider)
    .with("laminar", () =>
      withLaminarObservability(
        {
          config: input.observability!.providers.laminar,
          modelProvider: input.modelProvider,
          operationName: input.operationName,
          metadata: input.metadata,
        },
        execute,
      ),
    )
    .with("langsmith", () =>
      withLangSmithObservability(
        {
          config: input.observability!.providers.langsmith,
          modelProvider: input.modelProvider,
          operationName: input.operationName,
          metadata: input.metadata,
        },
        execute,
      ),
    )
    .exhaustive();
}
