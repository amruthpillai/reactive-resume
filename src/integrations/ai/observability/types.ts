import type { generateText } from "ai";

import { z } from "zod";

const AI_OBSERVABILITY_PROVIDERS = ["laminar", "langsmith"] as const;

export type AIObservabilityProvider = (typeof AI_OBSERVABILITY_PROVIDERS)[number];

export const aiObservabilityProviderSchema = z.enum(AI_OBSERVABILITY_PROVIDERS);

export const laminarObservabilityConfigSchema = z.object({
  projectApiKey: z.string(),
  baseUrl: z.string(),
  httpPort: z.string(),
  grpcPort: z.string(),
});

export const langSmithObservabilityConfigSchema = z.object({
  apiKey: z.string(),
  projectName: z.string(),
  endpoint: z.string(),
});

export const aiObservabilitySchema = z.object({
  enabled: z.boolean(),
  provider: aiObservabilityProviderSchema,
  providers: z.object({
    laminar: laminarObservabilityConfigSchema,
    langsmith: langSmithObservabilityConfigSchema,
  }),
});

export type AIObservabilityInput = z.infer<typeof aiObservabilitySchema>;
export type LaminarObservabilityConfig = z.infer<typeof laminarObservabilityConfigSchema>;
export type LangSmithObservabilityConfig = z.infer<typeof langSmithObservabilityConfigSchema>;
export type AIObservabilityTelemetry = NonNullable<Parameters<typeof generateText>[0]["experimental_telemetry"]>;
