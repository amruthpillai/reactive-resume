import type {
	ProviderRequest,
	ReadPageResult,
	WebAccessConnection,
	WebAccessContext,
	WebAccessFailure,
} from "./contracts";
import { env } from "@reactive-resume/env/server";
import { rateLimitConfig } from "@reactive-resume/utils/rate-limit";
import { createRateLimiter } from "../../redis";
import { abortable, assertPublicTarget, htmlToText, readBuiltinPage } from "./builtin";
import { MAX_SEARCH_QUERY_CHARS, MAX_SEARCH_RESULTS, WEB_ACCESS_DEADLINE_MS, WebAccessError } from "./contracts";
import { readExa, searchExa } from "./exa";
import { readFirecrawl, searchFirecrawl } from "./firecrawl";
import { readTavily, searchTavily } from "./tavily";
import { pageContent, safeFailure } from "./transport";

const limiter = createRateLimiter("web-access", rateLimitConfig.orpc.aiRequest);

async function consume(userId: string, signal: AbortSignal) {
	signal.throwIfAborted();
	if (process.env.NODE_ENV !== "production" || env.FLAG_DISABLE_API_RATE_LIMIT) return;
	const { success } = await abortable(limiter.limit(userId), signal);
	if (!success) throw new WebAccessError("rate-limit");
}

const deadline = (signal?: AbortSignal) =>
	AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(WEB_ACCESS_DEADLINE_MS)]);

async function externalSearch(query: string, options: ProviderRequest) {
	try {
		switch (options.connection.provider) {
			case "firecrawl":
				return await searchFirecrawl(query, options);
			case "tavily":
				return await searchTavily(query, options);
			case "exa":
				return await searchExa(query, options);
		}
	} catch (error) {
		throw safeFailure(error, options.signal);
	}
}

async function externalRead(url: string, options: ProviderRequest) {
	try {
		switch (options.connection.provider) {
			case "firecrawl":
				return await readFirecrawl(url, options);
			case "tavily":
				return await readTavily(url, options);
			case "exa":
				return await readExa(url, options);
		}
	} catch (error) {
		throw safeFailure(error, options.signal);
	}
}

function log(operation: "search" | "read", provider: string, started: number, outcome: string, fallback?: string) {
	console.info("[web-access]", {
		provider,
		operation,
		durationMs: Date.now() - started,
		outcome,
		...(fallback ? { fallback } : {}),
	});
}

function searchInput(query: string) {
	const input = query.trim();
	if (!input || input.length > MAX_SEARCH_QUERY_CHARS) throw new WebAccessError("malformed");
	return input;
}

/** Deduplicates by URL and takes results round-robin in region order, so each region that returned anything shows. */
function interleave<T extends { url: string }>(lists: T[][]) {
	const seen = new Set<string>();
	const merged: T[] = [];
	const longest = Math.max(...lists.map((list) => list.length));
	for (let index = 0; index < longest; index++) {
		for (const list of lists) {
			const item = list[index];
			if (!item || seen.has(item.url)) continue;
			seen.add(item.url);
			merged.push(item);
		}
	}
	return merged.slice(0, MAX_SEARCH_RESULTS);
}

/**
 * One rate-limited search. Each region gets its own provider call, with `queryFor(region)` as its query when given,
 * in parallel under one deadline. A failed region drops out unless every region fails.
 */
export async function searchWeb(query: string, context: WebAccessContext, queryFor?: (region: string) => string) {
	const signal = deadline(context.signal);
	const started = Date.now();
	const provider = context.connection?.provider ?? "builtin";
	try {
		await consume(context.userId, signal);
		const connection = context.connection;
		if (!connection) throw new WebAccessError("unavailable");
		const input = searchInput(query);
		const searches = (context.regions ?? []).map((region) => ({
			region,
			query: queryFor ? searchInput(queryFor(region)) : input,
		}));
		let results: Awaited<ReturnType<typeof externalSearch>>;
		let partial: string | undefined;
		if (searches.length === 0) results = await externalSearch(input, { connection, signal });
		else {
			const settled = await Promise.allSettled(
				searches.map((search) => externalSearch(search.query, { connection, signal, region: search.region })),
			);
			const lists = settled.flatMap((outcome) => (outcome.status === "fulfilled" ? [outcome.value] : []));
			if (lists.length === 0) throw (settled[0] as PromiseRejectedResult).reason;
			const failed = settled.length - lists.length;
			if (failed) partial = `${failed}/${settled.length}-regions-failed`;
			results = interleave(lists);
		}
		signal.throwIfAborted();
		log("search", provider, started, "success", partial);
		return results;
	} catch (error) {
		log(
			"search",
			provider,
			started,
			signal.aborted ? "aborted" : error instanceof WebAccessError ? error.reason : "unreachable",
		);
		throw safeFailure(error, signal);
	}
}

/** One deadline covers DNS, the selected provider, and the direct fallback. Cancellation never falls back. */
export async function readPage(input: string, context: WebAccessContext): Promise<ReadPageResult> {
	const signal = deadline(context.signal);
	const started = Date.now();
	const provider = context.connection?.provider ?? "builtin";
	let fallback: WebAccessFailure | undefined;
	try {
		await consume(context.userId, signal);
		const url = await assertPublicTarget(input, signal);
		if (context.connection) {
			// Reserve five seconds of the same overall budget for the direct reader.
			const externalBudget = Math.max(1, WEB_ACCESS_DEADLINE_MS - (Date.now() - started) - 5_000);
			const externalSignal = AbortSignal.any([signal, AbortSignal.timeout(externalBudget)]);
			try {
				// Remote services must independently protect their own redirects and DNS lookups.
				const page = await externalRead(url.toString(), {
					connection: context.connection,
					signal: externalSignal,
				});
				if (page.resolvedUrl) await assertPublicTarget(page.resolvedUrl, externalSignal);
				const content = pageContent(page.content);
				externalSignal.throwIfAborted();
				log("read", provider, started, "success");
				return {
					...page,
					...content,
					requestedUrl: url.toString(),
					retrievedAt: new Date().toISOString(),
					method: context.connection.provider,
				};
			} catch (error) {
				signal.throwIfAborted();
				const failure = safeFailure(error, externalSignal);
				if (failure.reason === "unsafe-url") throw failure;
				fallback = failure.reason;
			}
		}
		const page = await readBuiltinPage(url.toString(), signal);
		const content = pageContent(htmlToText(page.html));
		signal.throwIfAborted();
		log("read", provider, started, "success", fallback ? `${fallback}:builtin` : undefined);
		return {
			...page,
			...content,
			requestedUrl: url.toString(),
			retrievedAt: new Date().toISOString(),
			method: "builtin",
			format: "text",
			...(fallback ? { fallbackReason: fallback } : {}),
		};
	} catch (error) {
		log(
			"read",
			provider,
			started,
			signal.aborted ? "aborted" : error instanceof WebAccessError ? error.reason : "unreachable",
			fallback ? `${fallback}:failed` : undefined,
		);
		throw safeFailure(error, signal);
	}
}

/** Explicit settings test. Provider operations are independent and never use the built-in fallback. */
export async function probeWebAccess(
	connection: WebAccessConnection,
	context: { userId: string; signal?: AbortSignal | undefined; region?: string | undefined },
) {
	const signal = deadline(context.signal);
	await consume(context.userId, signal);
	const probe = async (operation: "search" | "read") => {
		const started = Date.now();
		try {
			if (operation === "search")
				await externalSearch("example domain", { connection, signal, region: context.region });
			else {
				const url = await assertPublicTarget("https://example.com/", signal);
				const page = await externalRead(url.toString(), { connection, signal });
				pageContent(page.content);
				if (page.resolvedUrl) await assertPublicTarget(page.resolvedUrl, signal);
			}
			signal.throwIfAborted();
			log(operation, connection.provider, started, "success");
			return { success: true };
		} catch (error) {
			const failure = safeFailure(error, signal);
			log(operation, connection.provider, started, failure.reason);
			return { success: false, error: failure.reason };
		}
	};
	const [search, read] = await Promise.all([probe("search"), probe("read")]);
	return { search, read };
}
