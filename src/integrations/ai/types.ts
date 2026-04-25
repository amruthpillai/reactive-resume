import { z } from "zod";

export const AI_PROVIDERS = ["openai", "anthropic", "gemini", "vercel-ai-gateway", "openrouter", "ollama"] as const;

export type AIProvider = (typeof AI_PROVIDERS)[number];

export const aiProviderSchema = z.enum(AI_PROVIDERS);
