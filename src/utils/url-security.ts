import { isIP } from "node:net";

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase();
}

function stripIpv6Brackets(hostname: string): string {
  return hostname.replace(/^\[/, "").replace(/\]$/, "");
}

function isLoopbackOrLocalHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  return (
    normalized === "localhost" || normalized === "::1" || normalized === "[::1]" || normalized.endsWith(".localhost")
  );
}

function isPrivateIPv4(hostname: string) {
  const [first = 0, second = 0] = hostname.split(".").map((part) => Number.parseInt(part, 10));
  if (Number.isNaN(first) || Number.isNaN(second)) return false;

  if (first === 10) return true;
  if (first === 127) return true;
  if (first === 169 && second === 254) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first === 0) return true;

  return false;
}

function isPrivateIPv6(hostname: string) {
  const normalized = stripIpv6Brackets(normalizeHostname(hostname));
  return (
    normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")
  );
}

export function isPrivateOrLoopbackHost(hostname: string) {
  const normalized = stripIpv6Brackets(normalizeHostname(hostname));
  if (isLoopbackOrLocalHostname(normalized)) return true;

  const ipVersion = isIP(normalized);
  if (ipVersion === 4) return isPrivateIPv4(normalized);
  if (ipVersion === 6) return isPrivateIPv6(normalized);

  return false;
}

export function parseUrl(input: string) {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

export function parseAllowedHostList(value?: string) {
  if (!value) return new Set<string>();

  const hosts = value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return new Set(hosts);
}

export function isAllowedExternalUrl(input: string, allowedHosts: Set<string>) {
  const parsed = parseUrl(input);
  if (!parsed) return false;
  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  if (isPrivateOrLoopbackHost(parsed.hostname)) return false;

  const hostname = normalizeHostname(parsed.hostname);
  if (allowedHosts.has(hostname)) return true;

  const origin = parsed.origin.toLowerCase();
  return allowedHosts.has(origin);
}

export function sanitizeResumePictureUrl(url: string, appUrl: string) {
  if (!url) return "";
  if (url.startsWith("/uploads/")) return url;

  const parsed = parseUrl(url);
  if (!parsed) return "";
  if (parsed.username || parsed.password) return "";
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";

  const app = parseUrl(appUrl);
  if (!app) return "";

  if (parsed.origin !== app.origin) return "";
  if (!parsed.pathname.startsWith("/uploads/")) return "";

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
