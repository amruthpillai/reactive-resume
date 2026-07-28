import canonicalize from "canonicalize";

const HASH_DOMAIN_VERSION = 1;
const HASH_DOMAIN_PREFIX = "reactive-resume:public-style-projection:v1\0";

export type RenderDataHashInput = {
	domainVersion: number;
	data: unknown;
	resolvedNodes?: unknown;
	projectionFingerprints?: unknown;
};

function hasUnpairedSurrogate(value: string): boolean {
	for (let index = 0; index < value.length; index++) {
		const code = value.charCodeAt(index);
		if (code >= 0xd800 && code <= 0xdbff) {
			const next = value.charCodeAt(index + 1);
			if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
			index++;
		} else if (code >= 0xdc00 && code <= 0xdfff) {
			return true;
		}
	}

	return false;
}

function assertEnumerableDataProperty(
	descriptor: PropertyDescriptor | undefined,
): asserts descriptor is PropertyDescriptor & {
	value: unknown;
} {
	if (!descriptor?.enumerable || "get" in descriptor || "set" in descriptor) {
		throw new Error("I-JSON objects must contain only enumerable data properties");
	}
}

function isArrayIndex(key: string, length: number): boolean {
	if (!/^(0|[1-9]\d*)$/.test(key)) return false;
	const index = Number(key);
	return Number.isSafeInteger(index) && index < length && String(index) === key;
}

function assertIJsonValue(value: unknown, seen = new Set<object>()): void {
	if (value === null || typeof value === "boolean") return;
	if (typeof value === "string") {
		if (hasUnpairedSurrogate(value)) throw new Error("I-JSON values must not contain unpaired surrogates");
		return;
	}
	if (typeof value === "number") {
		if (Number.isFinite(value)) return;
		throw new Error("I-JSON numbers must be finite");
	}
	if (typeof value !== "object") throw new Error("I-JSON values must be JSON primitives, arrays, or plain objects");
	if (seen.has(value)) throw new Error("I-JSON values must not be circular");

	const prototype = Object.getPrototypeOf(value);
	if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
		throw new Error("I-JSON objects must be plain objects");
	}

	seen.add(value);
	try {
		if (Array.isArray(value)) {
			for (const symbol of Object.getOwnPropertySymbols(value)) {
				throw new Error(`I-JSON arrays must not contain symbol keys: ${String(symbol)}`);
			}

			const descriptors = Object.getOwnPropertyDescriptors(value);
			for (const [key, descriptor] of Object.entries(descriptors)) {
				if (key === "length") continue;
				if (!isArrayIndex(key, value.length)) throw new Error("I-JSON arrays must not contain named properties");
				assertEnumerableDataProperty(descriptor);
			}
			for (let index = 0; index < value.length; index++) {
				const descriptor = descriptors[index];
				if (!descriptor) throw new Error("I-JSON arrays must not contain holes");
				assertIJsonValue(descriptor.value, seen);
			}
		} else {
			for (const symbol of Object.getOwnPropertySymbols(value)) {
				throw new Error(`I-JSON objects must not contain symbol keys: ${String(symbol)}`);
			}
			for (const key of Object.getOwnPropertyNames(value)) {
				if (hasUnpairedSurrogate(key)) throw new Error("I-JSON keys must not contain unpaired surrogates");
				const descriptor = Object.getOwnPropertyDescriptor(value, key);
				assertEnumerableDataProperty(descriptor);
				assertIJsonValue(descriptor.value, seen);
			}
		}
	} finally {
		seen.delete(value);
	}
}

export async function computeRenderDataHash(input: RenderDataHashInput): Promise<string> {
	if (input.domainVersion !== HASH_DOMAIN_VERSION) {
		throw new Error(`Unsupported public render hash domain version: ${input.domainVersion}`);
	}

	const payload =
		input.resolvedNodes === undefined && input.projectionFingerprints === undefined
			? input.data
			: {
					data: input.data,
					...(input.resolvedNodes === undefined ? {} : { resolvedNodes: input.resolvedNodes }),
					...(input.projectionFingerprints === undefined
						? {}
						: { projectionFingerprints: input.projectionFingerprints }),
				};
	assertIJsonValue(payload);

	const canonical = canonicalize(payload);
	if (canonical === undefined) throw new Error("I-JSON value required for public render hashing");
	const digest = await globalThis.crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(HASH_DOMAIN_PREFIX + canonical),
	);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
