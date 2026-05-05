import { Client } from "langsmith";
import { traceable } from "langsmith/traceable";

import type { AIProvider } from "@/integrations/ai/types";

import type { AIObservabilityTelemetry, LangSmithObservabilityConfig } from "../types";

type WithLangSmithObservabilityInput = {
  config: LangSmithObservabilityConfig;
  modelProvider: AIProvider;
  operationName: string;
  metadata: Record<string, unknown>;
};

function resolveLangSmithConfig(config: LangSmithObservabilityConfig) {
  const apiKey = config.apiKey.trim();

  if (apiKey.length === 0) return null;

  return {
    apiKey,
    projectName: config.projectName.trim() || undefined,
    apiUrl: config.endpoint.trim() || undefined,
  };
}

export async function withLangSmithObservability<T>(
  input: WithLangSmithObservabilityInput,
  execute: (telemetry: AIObservabilityTelemetry | undefined) => Promise<T>,
): Promise<T> {
  const config = resolveLangSmithConfig(input.config);
  if (!config) return execute(undefined);

  const client = new Client({
    apiKey: config.apiKey,
    apiUrl: config.apiUrl,
    omitTracedRuntimeInfo: true,
  });

  const tracedExecute = traceable(async () => execute(undefined), {
    client,
    name: input.operationName,
    run_type: "llm",
    project_name: config.projectName,
    tracingEnabled: true,
    tags: ["ai", "langsmith", input.modelProvider, "request"],
    metadata: { ...input.metadata, observabilityProvider: "langsmith" },
  });

  try {
    return await tracedExecute();
  } finally {
    await client.flush();
  }
}
