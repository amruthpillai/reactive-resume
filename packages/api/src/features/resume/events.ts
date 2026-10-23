import { EventEmitter, on, once } from "node:events";
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

const isAbort = (error: unknown) => error instanceof Error && error.name === "AbortError";

// Without Redis, one PostgreSQL connection per process listens and fans notifications out in memory. A connection per
// open editor would use up the pool after a handful of subscribers.
let pgNotifications: Promise<EventEmitter> | undefined;
function sharedPgNotifications() {
	pgNotifications ??= (async () => {
		const client = await getPool().connect();
		const emitter = new EventEmitter().setMaxListeners(0);
		client.on("notification", (notification) => emitter.emit("notification", notification));
		// A dropped connection is replaced on the next subscription. Open subscriptions end with the error; with none
		// open, emitting an unheard "error" would crash the process.
		client.on("error", (error) => {
			pgNotifications = undefined;
			client.release(error);
			if (emitter.listenerCount("error") > 0) emitter.emit("error", error);
		});
		client.on("end", () => {
			pgNotifications = undefined;
		});
		await client.query(`LISTEN ${RESUME_UPDATED_CHANNEL}`);
		return emitter;
	})().catch((error: unknown) => {
		pgNotifications = undefined;
		throw error;
	});
	return pgNotifications;
}

export async function* subscribeResumeUpdated({ resumeId, userId, signal }: SubscribeResumeUpdatedInput) {
	if (signal?.aborted) return;
	const shared = getCoordination();
	if (shared) {
		for await (const payload of shared.subscribe(redisKey(RESUME_UPDATED_CHANNEL, resumeId), signal)) {
			const event = readEvent(payload, resumeId, userId);
			if (event) yield event;
		}
		return;
	}
	const subscriber = getRedis()?.duplicate({ commandTimeout: 5_000 });
	const listener = subscriber ? undefined : await sharedPgNotifications();
	const channel = subscriber ? redisKey(RESUME_UPDATED_CHANNEL) : RESUME_UPDATED_CHANNEL;
	// `on` queues notifications from now on, so none that arrive while subscribing are lost. It rethrows the
	// connection's "error" event and ends with an AbortError when the signal aborts.
	const notifications = subscriber
		? on(subscriber, "message", { signal })
		: on(listener as EventEmitter, "notification", { signal });

	try {
		if (subscriber) {
			// A subscription that never connects still ends when the caller goes away.
			const aborted = signal ? once(signal, "abort") : new Promise<never>(() => {});
			await Promise.race([subscriber.subscribe(channel), aborted]);
			if (signal?.aborted) return;
		}

		for await (const args of notifications) {
			const [notificationChannel, payload] = subscriber
				? (args as [string, string])
				: [(args[0] as PgNotification).channel, (args[0] as PgNotification).payload];
			if (notificationChannel !== channel) continue;
			const event = readEvent(payload, resumeId, userId);
			if (event) yield event;
		}
	} catch (error) {
		if (!isAbort(error) || !signal?.aborted) throw error;
	} finally {
		// The duplicate connection exists only for this subscription; closing it unsubscribes. The shared PostgreSQL
		// listener stays for the next subscriber.
		subscriber?.disconnect();
	}
}
