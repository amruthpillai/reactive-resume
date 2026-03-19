import { t } from "@lingui/core/macro";

import type { RapidApiQuota } from "@/schema/jobs";

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
  period: string | null,
): string {
  if (!min && !max) return "";

  const formatCurrency = (amount: number) => {
    const resolvedCurrency = currency ?? "USD";
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: resolvedCurrency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${resolvedCurrency} ${amount.toLocaleString()}`;
    }
  };

  if (min && max) return `${formatCurrency(min)} - ${formatCurrency(max)}${period ? ` / ${period}` : ""}`;
  if (min) return `${formatCurrency(min)}+${period ? ` / ${period}` : ""}`;
  if (!max) return "";
  return `Up to ${formatCurrency(max)}${period ? ` / ${period}` : ""}`;
}

export function formatPostedDate(timestamp: number | null): string {
  if (!timestamp) return "";

  const postedDate = new Date(timestamp * 1000);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return t`Today`;
  if (diffDays === 1) return t`Yesterday`;
  if (diffDays < 7) return t`${diffDays} days ago`;
  if (diffDays < 30) return t`${Math.floor(diffDays / 7)} weeks ago`;
  return t`${Math.floor(diffDays / 30)} months ago`;
}

export function getQuotaStatus(quota: RapidApiQuota): "healthy" | "warning" | "critical" {
  if (quota.limit <= 0) return "healthy";
  const usage = quota.used / quota.limit;
  if (usage >= 0.9) return "critical";
  if (usage >= 0.75) return "warning";
  return "healthy";
}

export function isValidExternalUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
