import { createRatelimitMiddleware } from "@orpc/experimental-ratelimit";
import { MemoryRatelimiter } from "@orpc/experimental-ratelimit/memory";

type ContextWithHeaders = {
  reqHeaders?: Headers;
  user?: { id: string } | null;
};

function getClientKey(headers?: Headers): string {
  const cfIp = headers?.get("cf-connecting-ip")?.trim();
  const cfRay = headers?.get("cf-ray");
  if (cfIp && cfRay) return `cf:${cfIp}`;

  const userAgent = headers?.get("user-agent")?.trim() ?? "unknown";
  const language = headers?.get("accept-language")?.split(",")[0]?.trim() ?? "none";

  return `fp:${userAgent.slice(0, 64)}:${language.slice(0, 16)}`;
}

function getUserKey(context: ContextWithHeaders): string {
  return context.user?.id ?? "anon";
}

const resumePasswordLimiter = new MemoryRatelimiter({ maxRequests: 5, window: 10 * 60 * 1000 });
const pdfLimiter = new MemoryRatelimiter({ maxRequests: 5, window: 60 * 1000 });
const aiLimiter = new MemoryRatelimiter({ maxRequests: 20, window: 60 * 1000 });

export const resumePasswordRateLimit = createRatelimitMiddleware<
  ContextWithHeaders,
  { username: string; slug: string }
>({
  limiter: resumePasswordLimiter,
  key: ({ context }, input) => `resume-password:${input.username}:${input.slug}:${getClientKey(context.reqHeaders)}`,
});

export const pdfExportRateLimit = createRatelimitMiddleware<ContextWithHeaders, { id: string }>({
  limiter: pdfLimiter,
  key: ({ context }, input) => `pdf-export:${getUserKey(context)}:${input.id}`,
});

export const aiRequestRateLimit = createRatelimitMiddleware<ContextWithHeaders, { provider: string }>({
  limiter: aiLimiter,
  key: ({ context }, input) => `ai-request:${getUserKey(context)}:${input.provider}`,
});
