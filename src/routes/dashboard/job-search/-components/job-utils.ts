import { plural, t } from "@lingui/core/macro";

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
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: resolvedCurrency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${resolvedCurrency} ${amount.toLocaleString()}`;
    }
  };

  const periodSuffix = period ? ` / ${period}` : "";

  if (min && max) return `${formatCurrency(min)} - ${formatCurrency(max)}${periodSuffix}`;
  if (min) return `${formatCurrency(min)}+${periodSuffix}`;
  if (!max) return "";
  return t({
    comment: "Salary label when only an upper salary bound is available",
    message: `Up to ${formatCurrency(max)}${periodSuffix}`,
  });
}

export function formatPostedDate(timestamp: number | null): string {
  if (!timestamp) return "";

  const postedDate = new Date(timestamp * 1000);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return t`Today`;
  if (diffDays === 1) return t`Yesterday`;
  if (diffDays < 7) {
    return plural(diffDays, {
      one: "# day ago",
      other: "# days ago",
    });
  }

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return plural(weeks, {
      one: "# week ago",
      other: "# weeks ago",
    });
  }

  const months = Math.floor(diffDays / 30);
  return plural(months, {
    one: "# month ago",
    other: "# months ago",
  });
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
