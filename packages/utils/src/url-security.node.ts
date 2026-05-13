import { isIP } from "node:net";

function normalizeHostname(hostname: string) {
	return hostname.trim().toLowerCase();
}

function stripIpv6Brackets(hostname: string): string {
	return hostname.replace(/^\[/, "").replace(/\]$/, "");
}

function normalizeIpv4MappedIpv6(hostname: string) {
	const normalized = stripIpv6Brackets(normalizeHostname(hostname));
	const mapped = normalized.match(/^::ffff:(?<address>.+)$/)?.groups?.address;
	if (!mapped) return normalized;

	if (isIP(mapped) === 4) return mapped;

	const hexMatch = mapped.match(/^(?<high>[0-9a-f]{1,4}):(?<low>[0-9a-f]{1,4})$/);
	if (!hexMatch?.groups) return normalized;

	const { high: highHex, low: lowHex } = hexMatch.groups;
	if (!highHex || !lowHex) return normalized;

	const high = Number.parseInt(highHex, 16);
	const low = Number.parseInt(lowHex, 16);
	if (Number.isNaN(high) || Number.isNaN(low) || high > 0xffff || low > 0xffff) return normalized;

	return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
}

function isIpv4MappedIpv6(hostname: string) {
	const normalized = stripIpv6Brackets(normalizeHostname(hostname));

	return normalized.startsWith("::ffff:");
}

const blockedIpv4Cidrs: Array<[number, number]> = [
	[knownIpv4ToNumber("0.0.0.0"), 8],
	[knownIpv4ToNumber("10.0.0.0"), 8],
	[knownIpv4ToNumber("100.64.0.0"), 10],
	[knownIpv4ToNumber("127.0.0.0"), 8],
	[knownIpv4ToNumber("169.254.0.0"), 16],
	[knownIpv4ToNumber("172.16.0.0"), 12],
	[knownIpv4ToNumber("192.0.0.0"), 24],
	[knownIpv4ToNumber("192.0.2.0"), 24],
	[knownIpv4ToNumber("192.88.99.0"), 24],
	[knownIpv4ToNumber("192.168.0.0"), 16],
	[knownIpv4ToNumber("198.18.0.0"), 15],
	[knownIpv4ToNumber("198.51.100.0"), 24],
	[knownIpv4ToNumber("203.0.113.0"), 24],
	[knownIpv4ToNumber("224.0.0.0"), 4],
	[knownIpv4ToNumber("240.0.0.0"), 4],
];

const blockedIpv6Cidrs: Array<[bigint, number]> = [
	[knownIpv6ToBigInt("::"), 128],
	[knownIpv6ToBigInt("::1"), 128],
	[knownIpv6ToBigInt("::ffff:0:0"), 96],
	[knownIpv6ToBigInt("64:ff9b::"), 96],
	[knownIpv6ToBigInt("64:ff9b:1::"), 48],
	[knownIpv6ToBigInt("100::"), 64],
	[knownIpv6ToBigInt("100:0:0:1::"), 64],
	[knownIpv6ToBigInt("2001::"), 23],
	[knownIpv6ToBigInt("2001:2::"), 48],
	[knownIpv6ToBigInt("2001:10::"), 28],
	[knownIpv6ToBigInt("2001:db8::"), 32],
	[knownIpv6ToBigInt("2002::"), 16],
	[knownIpv6ToBigInt("3fff::"), 20],
	[knownIpv6ToBigInt("5f00::"), 16],
	[knownIpv6ToBigInt("fc00::"), 7],
	[knownIpv6ToBigInt("fe80::"), 10],
	[knownIpv6ToBigInt("ff00::"), 8],
];

function ipv4ToNumber(hostname: string) {
	const octets = hostname.split(".").map((part) => Number.parseInt(part, 10));
	if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) return null;

	return (((octets[0] ?? 0) << 24) | ((octets[1] ?? 0) << 16) | ((octets[2] ?? 0) << 8) | (octets[3] ?? 0)) >>> 0;
}

function knownIpv4ToNumber(hostname: string) {
	const value = ipv4ToNumber(hostname);
	if (value === null) throw new Error(`Invalid IPv4 CIDR base: ${hostname}`);

	return value;
}

function isIpv4InCidr(address: number, base: number, prefix: number) {
	const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;

	return (address & mask) === (base & mask);
}

function expandIpv6(hostname: string) {
	const normalized = stripIpv6Brackets(normalizeHostname(hostname));
	const [head = "", tail = ""] = normalized.split("::", 2);
	const headParts = head ? head.split(":") : [];
	const tailParts = tail ? tail.split(":") : [];
	const missing = 8 - headParts.length - tailParts.length;
	if (missing < 0) return null;

	const parts = [...headParts, ...Array.from({ length: missing }, () => "0"), ...tailParts];
	if (parts.length !== 8) return null;

	const hextets = parts.map((part) => {
		if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
		return Number.parseInt(part, 16);
	});

	return hextets.every((part) => part !== null && part >= 0 && part <= 0xffff) ? (hextets as number[]) : null;
}

function ipv6ToBigInt(hostname: string) {
	const hextets = expandIpv6(hostname);
	if (!hextets) return null;

	return hextets.reduce((value, hextet) => (value << 16n) | BigInt(hextet), 0n);
}

function knownIpv6ToBigInt(hostname: string) {
	const value = ipv6ToBigInt(hostname);
	if (value === null) throw new Error(`Invalid IPv6 CIDR base: ${hostname}`);

	return value;
}

function isIpv6InCidr(address: bigint, base: bigint, prefix: number) {
	const bits = 128n;
	const hostBits = bits - BigInt(prefix);
	const mask = prefix === 0 ? 0n : ((1n << bits) - 1n) ^ ((1n << hostBits) - 1n);

	return (address & mask) === (base & mask);
}

function isLoopbackOrLocalHostname(hostname: string) {
	const normalized = normalizeHostname(hostname);
	return (
		normalized === "localhost" || normalized === "::1" || normalized === "[::1]" || normalized.endsWith(".localhost")
	);
}

function isPrivateIPv4(hostname: string) {
	const address = ipv4ToNumber(hostname);
	if (address === null) return false;

	return blockedIpv4Cidrs.some(([base, prefix]) => isIpv4InCidr(address, base ?? 0, prefix));
}

function isPrivateIPv6(hostname: string) {
	const address = ipv6ToBigInt(hostname);
	if (address === null) return false;

	return blockedIpv6Cidrs.some(([base, prefix]) => isIpv6InCidr(address, base, prefix));
}

export function isPrivateOrLoopbackHost(hostname: string) {
	if (isIpv4MappedIpv6(hostname)) return true;

	const normalized = normalizeIpv4MappedIpv6(hostname);
	if (isLoopbackOrLocalHostname(normalized)) return true;

	const ipVersion = isIP(normalized);
	if (ipVersion === 4) return isPrivateIPv4(normalized);
	if (ipVersion === 6) return isPrivateIPv6(normalized);

	return false;
}

function isOAuthLoopbackRedirectHost(hostname: string) {
	const normalized = stripIpv6Brackets(normalizeHostname(hostname));
	return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
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

export function isAllowedOAuthRedirectUri(input: string, trustedOrigins: string[], allowedHosts: Set<string>) {
	const parsed = parseUrl(input);
	if (!parsed) return false;
	if (parsed.username || parsed.password) return false;
	if (parsed.hash) return false;

	const origin = parsed.origin.toLowerCase();
	const hostname = normalizeHostname(parsed.hostname);

	if (parsed.protocol === "http:") return isOAuthLoopbackRedirectHost(hostname);
	if (parsed.protocol !== "https:") return false;
	if (isPrivateOrLoopbackHost(hostname)) return false;

	if (trustedOrigins.includes(origin)) return true;
	if (allowedHosts.has(origin)) return true;

	return allowedHosts.has(hostname);
}
