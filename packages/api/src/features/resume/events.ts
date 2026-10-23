import { EventEmitter, on } from "node:events";
import { getPool } from "@reactive-resume/db/client";
import { getCoordination } from "@reactive-resume/db/coordination";
import { getRedis, redisKey } from "@reactive-resume/db/redis";

const RESUME_UPDATED_CHANNEL = "resume_updated";
const resumeMutationNames = new Set(["sync", "create", "update", "patch", "lock", "password", "delete"] as const);

type PgNotification = {
	channel?: string | undefined;
	payload?: string | undefined;
};

export type ResumeUpdatedEvent = {
	type: "resume.updated";
	resumeId: string;
	userId: string;
	updatedAt: string;
	mutation: "sync" | "create" | "update" | "patch" | "lock" | "password" | "delete";
};

type SubscribeResumeUpdatedInput = {
	resumeId: string;
	userId: string;
	signal?: AbortSignal;
};

function isResumeUpdatedEvent(value: unknown): value is ResumeUpdatedEvent {
	if (!value || typeof value !== "object") return false;

	const event = value as Partial<ResumeUpdatedEvent>;
	return (
		event.type === "resume.updated" &&
		typeof event.resumeId === "string" &&
		typeof event.userId === "string" &&
		typeof event.updatedAt === "string" &&
		typeof event.mutation === "string" &&
		resumeMutationNames.has(event.mutation as ResumeUpdatedEvent["mutation"])
	);
}

export async function publishResumeUpdated(event: ResumeUpdatedEvent) {
	const shared = getCoordination();
	if (shared) return shared.publish(redisKey(RESUME_UPDATED_CHANNEL, event.resumeId), JSON.stringify(event));
	const redis = getRedis();
	if (redis) {
		await redis.publish(redisKey(RESUME_UPDATED_CHANNEL), JSON.stringify(event));
		return;
	}
	await getPool().query("SELECT pg_notify($1, $2)", [RESUME_UPDATED_CHANNEL, JSON.stringify(event)]);
}

/** The event a notification carries, when it's one for this subscription. */
function readEvent(payload: string | undefined, resumeId: string, userId: string) {
	if (!payload) return undefined;
	try {
		const event = JSON.parse(payload) as unknown;
		if (isResumeUpdatedEvent(event) && event.resumeId === resumeId && event.userId === userId) return event;
	} catch {
		// Ignore malformed notifications; the refetch path is invalidation-only.
	}
	return undefined;
}

const isAbort = (error: unknown, signal?: AbortSignal) =>
	Boolean(signal?.aborted && (error === signal.reason || (error instanceof Error && error.name === "AbortError")));
const asReleaseError = (error: unknown) => (error instanceof Error ? error : true);

/** Races a promise against an abort signal, removing the abort listener as soon as the promise settles. */
function raceSignal<T>(promise: Promise<T>, signal?: AbortSignal, onAbort?: (reason: unknown) => void): Promise<T> {
	if (!signal) return promise;
	if (signal.aborted) {
		onAbort?.(signal.reason);
		promise.catch(() => {});
		return Promise.reject(signal.reason);
	}
	return new Promise<T>((resolve, reject) => {
		const abortHandler = () => {
			onAbort?.(signal.reason);
			reject(signal.reason);
		};
		signal.addEventListener("abort", abortHandler, { once: true });
		promise.then(
			(value) => {
				signal.removeEventListener("abort", abortHandler);
				resolve(value);
			},
			(error) => {
				signal.removeEventListener("abort", abortHandler);
				reject(error);
			},
		);
	});
}

type Upstream = { close(error?: unknown): Promise<void> | void };
/**
 * Opens the one upstream connection a feed reads from. Calling `fail` ends the feed for every subscriber. `signal`
 * aborts when the feed ends, so a connect that may hang can stop early; one that resolves late is closed by the feed.
 */
type ConnectUpstream = (
	emit: (payload: string | undefined) => void,
	fail: (error: unknown) => void,
	signal: AbortSignal,
) => Promise<Upstream>;
type Feed = {
	events: EventEmitter;
	ready: Promise<unknown>;
	cancel: AbortController;
	open?: Upstream;
	subscribers: number;
	ended: boolean;
};

type FeedOwner = ReturnType<typeof getPool> | NonNullable<ReturnType<typeof getRedis>>;

// One feed per pool or Redis client, so all open subscriptions in a process share one connection. A connection per
// subscription let open builder tabs check out the whole database pool and starve every other query.
const feeds = new WeakMap<FeedOwner, Feed>();

async function endFeed(owner: FeedOwner, feed: Feed, error?: unknown) {
	if (feed.ended) return;
	feed.ended = true;
	if (feeds.get(owner) === feed) feeds.delete(owner);
	feed.cancel.abort(error);
	// Subscribers end with the error, so clients reconnect and the next subscription opens a fresh connection.
	if (error !== undefined && feed.events.listenerCount("error") > 0) feed.events.emit("error", error);
	await feed.open?.close(error);
}

function joinFeed(owner: FeedOwner, connect: ConnectUpstream): Feed {
	const existing = feeds.get(owner);
	if (existing) {
		existing.subscribers += 1;
		return existing;
	}
	const feed: Feed = {
		events: new EventEmitter().setMaxListeners(0),
		ready: Promise.resolve(),
		cancel: new AbortController(),
		subscribers: 1,
		ended: false,
	};
	const fail = (error: unknown) => void endFeed(owner, feed, error).catch(() => {});
	feed.ready = connect((payload) => feed.events.emit("payload", payload), fail, feed.cancel.signal).then((upstream) => {
		// The feed ended while this connection was still opening.
		if (feed.ended) return upstream.close();
		feed.open = upstream;
	});
	feed.ready.catch(fail);
	feeds.set(owner, feed);
	return feed;
}

async function* readFeed(owner: FeedOwner, connect: ConnectUpstream, signal?: AbortSignal) {
	if (signal?.aborted) return;
	const feed = joinFeed(owner, connect);
	// `on` queues payloads from now on, so none that arrive while connecting are lost. It rethrows the feed's
	// "error" event and ends with an AbortError when the signal aborts.
	const payloads = on(feed.events, "payload", signal ? { signal } : {});
	try {
		// A feed that never connects still ends when the caller goes away.
		await raceSignal(feed.ready, signal);
		if (signal?.aborted) return;
		for await (const [payload] of payloads) yield payload as string | undefined;
	} catch (error) {
		if (!isAbort(error, signal)) throw error;
	} finally {
		await payloads.return?.();
		feed.subscribers -= 1;
		if (feed.subscribers === 0) await endFeed(owner, feed);
	}
}

const listenOnPostgres =
	(pool: ReturnType<typeof getPool>): ConnectUpstream =>
	async (emit, fail, signal) => {
		const clientPromise = pool.connect();
		const client = await raceSignal(clientPromise, signal, () => {
			clientPromise.then((c) => c.release(true)).catch(() => {});
		});
		const onNotification = (notification: PgNotification) => {
			if (notification.channel === RESUME_UPDATED_CHANNEL) emit(notification.payload);
		};
		const detach = () => {
			client.off("notification", onNotification);
			client.off("error", fail);
		};
		client.on("notification", onNotification);
		client.on("error", fail);
		try {
			await raceSignal(client.query(`LISTEN ${RESUME_UPDATED_CHANNEL}`), signal);
		} catch (error) {
			detach();
			client.release(asReleaseError(error));
			throw error;
		}
		return {
			async close(error) {
				// A broken connection is discarded rather than returned to the pool.
				let releaseError = error === undefined ? undefined : asReleaseError(error);
				if (releaseError === undefined) {
					try {
						await client.query(`UNLISTEN ${RESUME_UPDATED_CHANNEL}`);
					} catch (unlistenError) {
						releaseError = asReleaseError(unlistenError);
					}
				}
				detach();
				client.release(releaseError);
			},
		};
	};

const subscribeOnRedis =
	(redis: NonNullable<ReturnType<typeof getRedis>>): ConnectUpstream =>
	async (emit, fail, signal) => {
		// A subscribed Redis connection can't run other commands, so the feed owns a duplicate.
		const subscriber = redis.duplicate({ commandTimeout: 5_000 });
		const channel = redisKey(RESUME_UPDATED_CHANNEL);
		const onMessage = (messageChannel: string, payload: string) => {
			if (messageChannel === channel) emit(payload);
		};
		const close = () => {
			subscriber.off("message", onMessage);
			subscriber.off("error", fail);
			// Closing the duplicate unsubscribes.
			subscriber.disconnect();
		};
		subscriber.on("message", onMessage);
		subscriber.on("error", fail);
		try {
			// A subscribe that never connects still ends when the feed does.
			await raceSignal(subscriber.subscribe(channel), signal);
		} catch (error) {
			close();
			throw error;
		}
		return { close };
	};

function readUpstream(signal?: AbortSignal) {
	const redis = getRedis();
	if (redis) return readFeed(redis, subscribeOnRedis(redis), signal);
	const pool = getPool();
	return readFeed(pool, listenOnPostgres(pool), signal);
}

export async function* subscribeResumeUpdated({ resumeId, userId, signal }: SubscribeResumeUpdatedInput) {
	if (signal?.aborted) return;
	const shared = getCoordination();
	const payloads = shared ? shared.subscribe(redisKey(RESUME_UPDATED_CHANNEL, resumeId), signal) : readUpstream(signal);
	for await (const payload of payloads) {
		const event = readEvent(payload, resumeId, userId);
		if (event) yield event;
	}
}
