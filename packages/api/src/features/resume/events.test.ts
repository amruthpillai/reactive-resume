import { EventEmitter, getEventListeners } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Pool } from "pg";

const pool = vi.hoisted(() => ({
	query: vi.fn().mockResolvedValue(undefined),
	connect: vi.fn(),
}));
// Tests that need real checkout limits swap in a real pg Pool here.
const database = vi.hoisted(() => ({ pool: undefined as unknown }));

vi.mock("@reactive-resume/db/client", () => ({ getPool: () => database.pool ?? pool }));
const redis = vi.hoisted(() => ({ getRedis: vi.fn(), publish: vi.fn(), duplicate: vi.fn() }));
vi.mock("@reactive-resume/db/redis", () => ({
	getRedis: redis.getRedis,
	redisKey: (key: string) => `reactive-resume:preview:${key}`,
}));

beforeEach(() => {
	vi.clearAllMocks();
	redis.getRedis.mockReturnValue(null);
});

const { publishResumeUpdated, subscribeResumeUpdated } = await import("./events");

const exampleEvent = {
	type: "resume.updated" as const,
	resumeId: "r1",
	userId: "u1",
	updatedAt: "2024-01-01T00:00:00Z",
	mutation: "patch" as const,
};

describe("publishResumeUpdated", () => {
	it("publishes through namespaced Redis when configured without querying Postgres", async () => {
		redis.getRedis.mockReturnValue(redis);
		await publishResumeUpdated(exampleEvent);
		expect(redis.publish).toHaveBeenCalledWith("reactive-resume:preview:resume_updated", JSON.stringify(exampleEvent));
		expect(pool.query).not.toHaveBeenCalled();
	});

	it("issues a pg_notify with the channel and serialized event", async () => {
		pool.query.mockClear();

		await publishResumeUpdated(exampleEvent);

		expect(pool.query).toHaveBeenCalledTimes(1);
		// oxlint-disable-next-line typescript/no-non-null-assertion -- The assertion above verifies the query call exists before destructuring it.
		const [sql, params] = pool.query.mock.calls[0]!;
		expect(sql).toBe("SELECT pg_notify($1, $2)");
		expect(params?.[0]).toBe("resume_updated");
		expect(JSON.parse(params?.[1] as string)).toEqual(exampleEvent);
	});
});

function makeSubscriber() {
	const emitter = new EventEmitter();
	return Object.assign(emitter, {
		subscribe: vi.fn().mockResolvedValue(1),
		disconnect: vi.fn(),
		send(channel: string, payload: string) {
			emitter.emit("message", channel, payload);
		},
	});
}

describe("Redis resume subscriptions", () => {
	it("uses a dedicated subscriber, filters messages, and closes it on abort", async () => {
		const subscriber = makeSubscriber();
		redis.getRedis.mockReturnValue(redis);
		redis.duplicate.mockReturnValue(subscriber);
		const controller = new AbortController();
		const iterator = subscribeResumeUpdated({ resumeId: "r1", userId: "u1", signal: controller.signal });
		const first = iterator.next();
		const channel = "reactive-resume:preview:resume_updated";
		subscriber.send("other", JSON.stringify(exampleEvent));
		subscriber.send(channel, "not json");
		subscriber.send(channel, JSON.stringify({ ...exampleEvent, userId: "other" }));
		subscriber.send(channel, JSON.stringify(exampleEvent));
		expect(await first).toEqual({ done: false, value: exampleEvent });
		const next = iterator.next();
		controller.abort();
		expect((await next).done).toBe(true);
		expect(redis.duplicate).toHaveBeenCalledWith({ commandTimeout: 5_000 });
		expect(subscriber.subscribe).toHaveBeenCalledWith(channel);
		expect(subscriber.disconnect).toHaveBeenCalledTimes(1);
		expect(subscriber.listenerCount("message")).toBe(0);
		expect(subscriber.listenerCount("error")).toBe(0);
		expect(pool.connect).not.toHaveBeenCalled();
	});

	it("disconnects if aborted while the Redis subscription is still connecting", async () => {
		const subscriber = makeSubscriber();
		subscriber.subscribe.mockReturnValue(new Promise(() => {}));
		redis.getRedis.mockReturnValue(redis);
		redis.duplicate.mockReturnValue(subscriber);
		const controller = new AbortController();
		const iterator = subscribeResumeUpdated({ resumeId: "r1", userId: "u1", signal: controller.signal });
		const next = iterator.next();
		controller.abort();
		expect((await next).done).toBe(true);
		expect(subscriber.disconnect).toHaveBeenCalledTimes(1);
	});

	it("closes the duplicate when subscription setup fails", async () => {
		const subscriber = makeSubscriber();
		subscriber.subscribe.mockRejectedValue(new Error("subscribe failed"));
		redis.getRedis.mockReturnValue(redis);
		redis.duplicate.mockReturnValue(subscriber);
		const iterator = subscribeResumeUpdated({ resumeId: "r1", userId: "u1" });
		await expect(iterator.next()).rejects.toThrow("subscribe failed");
		expect(subscriber.disconnect).toHaveBeenCalledTimes(1);
	});
});

const makeFakeClient = () => {
	const emitter = new EventEmitter();
	return Object.assign(emitter, {
		query: vi.fn().mockResolvedValue(undefined),
		release: vi.fn(),
		__notify(channel: string, payload: string) {
			emitter.emit("notification", { channel, payload });
		},
	});
};

describe("subscribeResumeUpdated", () => {
	it.each(["postgres", "redis"] as const)(
		"preserves %s connection errors during setup for every subscriber",
		async (backend) => {
			const client = makeFakeClient();
			const subscriber = makeSubscriber();
			if (backend === "postgres") {
				client.query.mockReturnValue(new Promise(() => {}));
				pool.connect.mockResolvedValueOnce(client);
			} else {
				subscriber.subscribe.mockReturnValue(new Promise(() => {}));
				redis.getRedis.mockReturnValue(redis);
				redis.duplicate.mockReturnValue(subscriber);
			}
			const results = Promise.allSettled(
				["r1", "r2"].map((resumeId) => subscribeResumeUpdated({ resumeId, userId: "u1" }).next()),
			);
			await vi.waitFor(() => expect(backend === "postgres" ? client.query : subscriber.subscribe).toHaveBeenCalled());
			const error = new Error("connection failed during setup");
			(backend === "postgres" ? client : subscriber).emit("error", error);

			expect(await results).toEqual([
				{ status: "rejected", reason: error },
				{ status: "rejected", reason: error },
			]);
			expect(backend === "postgres" ? client.release : subscriber.disconnect).toHaveBeenCalledTimes(1);
		},
	);

	it("shares one listening connection between subscribers and yields only their events", async () => {
		const client = makeFakeClient();
		pool.connect.mockResolvedValueOnce(client);

		const first = new AbortController();
		const second = new AbortController();
		const mine = subscribeResumeUpdated({ resumeId: "r1", userId: "u1", signal: first.signal });
		const theirs = subscribeResumeUpdated({ resumeId: "r2", userId: "u2", signal: second.signal });
		const mineNext = mine.next();
		const theirsNext = theirs.next();
		await vi.waitFor(() => expect(client.query).toHaveBeenCalledWith("LISTEN resume_updated"));
		await new Promise((resolve) => setImmediate(resolve));

		client.__notify("resume_updated", JSON.stringify(exampleEvent));
		client.__notify("resume_updated", JSON.stringify({ ...exampleEvent, resumeId: "r2", userId: "u2" }));

		expect(await mineNext).toEqual({ done: false, value: exampleEvent });
		expect((await theirsNext).value).toMatchObject({ resumeId: "r2" });
		expect(pool.connect).toHaveBeenCalledTimes(1);

		first.abort();
		second.abort();
		expect((await mine.next()).done).toBe(true);
		expect((await theirs.next()).done).toBe(true);
		expect(client.query).toHaveBeenCalledWith("UNLISTEN resume_updated");
		expect(client.release).toHaveBeenCalledTimes(1);
	});
});

type Callback = (error: Error | null, result?: unknown) => void;

/** Stands in for a Postgres socket; the Pool around it is the real pg-pool with its checkout limits. */
class FakePostgresSocket extends EventEmitter {
	static opened: FakePostgresSocket[] = [];
	listening = false;
	_queryable = true;
	_ending = false;

	constructor() {
		super();
		FakePostgresSocket.opened.push(this);
	}

	connect(callback?: Callback) {
		if (callback) return void setImmediate(() => callback(null));
		return Promise.resolve();
	}

	query(text: unknown, values?: unknown, callback?: Callback) {
		if (text === "LISTEN resume_updated") this.listening = true;
		if (text === "UNLISTEN resume_updated") this.listening = false;
		const done = typeof values === "function" ? (values as Callback) : callback;
		const result = { rows: [], rowCount: 0 };
		if (done) return void setImmediate(() => done(null, result));
		return Promise.resolve(result);
	}

	notify(event: typeof exampleEvent) {
		this.emit("notification", { channel: "resume_updated", payload: JSON.stringify(event) });
	}

	end(callback?: () => void) {
		callback?.();
		return Promise.resolve();
	}
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("Postgres resume subscriptions share one connection", () => {
	let realPool: Pool;
	type Handle = {
		controller: AbortController;
		iterator: ReturnType<typeof subscribeResumeUpdated>;
		next: Promise<IteratorResult<unknown>>;
	};
	const active: Handle[] = [];

	beforeEach(() => {
		FakePostgresSocket.opened = [];
		realPool = new Pool({ max: 10, connectionTimeoutMillis: 200, Client: FakePostgresSocket as never });
		database.pool = realPool;
	});

	afterEach(async () => {
		for (const handle of active.splice(0)) {
			handle.controller.abort();
			await handle.iterator.return().catch(() => {});
		}
		await tick();
		database.pool = undefined;
		await realPool.end();
	});

	function open(resumeId: string) {
		const controller = new AbortController();
		const iterator = subscribeResumeUpdated({ resumeId, userId: "u1", signal: controller.signal });
		const handle = { controller, iterator, next: iterator.next() };
		active.push(handle);
		return handle;
	}

	it("keeps the pool available to other queries with more open builders than pool slots", async () => {
		const subscriptions = Array.from({ length: 20 }, (_, index) => open(`r${index}`));
		for (const subscription of subscriptions) subscription.next.catch(() => {});
		await tick();

		expect(realPool.totalCount).toBe(1);
		await expect(realPool.query("SELECT 1")).resolves.toBeDefined();
	});

	it("delivers each subscription its own resume's events, then returns the connection when the last one leaves", async () => {
		const first = open("r1");
		const second = open("r2");
		await tick();
		const [socket] = FakePostgresSocket.opened;
		socket?.notify({ ...exampleEvent, resumeId: "r2" });
		socket?.notify(exampleEvent);

		expect(await first.next).toEqual({ done: false, value: exampleEvent });
		expect(await second.next).toEqual({ done: false, value: { ...exampleEvent, resumeId: "r2" } });

		first.controller.abort();
		expect((await first.iterator.next()).done).toBe(true);
		expect(socket?.listening).toBe(true);

		second.controller.abort();
		expect((await second.iterator.next()).done).toBe(true);
		expect(socket?.listening).toBe(false);
		expect(socket?.listenerCount("notification")).toBe(0);
		expect(realPool.idleCount).toBe(1);
		expect(realPool.totalCount).toBe(1);
	});

	it("ends every subscription when the shared connection breaks, and the next one reconnects", async () => {
		const first = open("r1");
		const second = open("r2");
		await tick();
		const [broken] = FakePostgresSocket.opened;
		broken?.emit("error", new Error("terminating connection due to administrator command"));

		await expect(first.next).rejects.toThrow("terminating connection");
		await expect(second.next).rejects.toThrow("terminating connection");
		await tick();
		expect(realPool.totalCount).toBe(0);

		const retry = open("r1");
		await tick();
		const [, fresh] = FakePostgresSocket.opened;
		expect(fresh?.listening).toBe(true);
		fresh?.notify(exampleEvent);
		expect(await retry.next).toEqual({ done: false, value: exampleEvent });
	});

	it("ends promptly when aborted while connection is hanging", async () => {
		const controller = new AbortController();
		const hangingPool = { connect: () => new Promise(() => {}) };
		database.pool = hangingPool;
		const iterator = subscribeResumeUpdated({ resumeId: "r1", userId: "u1", signal: controller.signal });
		const nextPromise = iterator.next();
		// Abort after readFeed started
		controller.abort();
		const result = await Promise.race([
			nextPromise,
			new Promise((_, reject) => setTimeout(() => reject(new Error("HUNG")), 200)),
		]);
		expect(result).toEqual({ done: true, value: undefined });
	});

	it("does not leak abort listeners on signal when subscription completes or is closed", async () => {
		const controller = new AbortController();
		const iterator = subscribeResumeUpdated({ resumeId: "r1", userId: "u1", signal: controller.signal });
		const nextPromise = iterator.next();
		await tick();
		const [socket] = FakePostgresSocket.opened;
		socket?.notify(exampleEvent);
		await nextPromise;
		await iterator.return();
		expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
	});
});

describe("Redis resume subscriptions share one subscriber", () => {
	it("shares one duplicate connection across all open subscriptions", async () => {
		const subscriber = makeSubscriber();
		redis.getRedis.mockReturnValue(redis);
		redis.duplicate.mockReturnValue(subscriber);
		const controllers = [new AbortController(), new AbortController()];
		const iterators = controllers.map((controller, index) =>
			subscribeResumeUpdated({ resumeId: `r${index + 1}`, userId: "u1", signal: controller.signal }),
		);
		const nexts = iterators.map((iterator) => iterator.next());
		await tick();
		subscriber.send("reactive-resume:preview:resume_updated", JSON.stringify({ ...exampleEvent, resumeId: "r2" }));
		subscriber.send("reactive-resume:preview:resume_updated", JSON.stringify(exampleEvent));

		expect(await nexts[0]).toEqual({ done: false, value: exampleEvent });
		expect(await nexts[1]).toEqual({ done: false, value: { ...exampleEvent, resumeId: "r2" } });
		expect(redis.duplicate).toHaveBeenCalledTimes(1);

		controllers[0]?.abort();
		await iterators[0]?.next();
		expect(subscriber.disconnect).not.toHaveBeenCalled();
		controllers[1]?.abort();
		await iterators[1]?.next();
		expect(subscriber.disconnect).toHaveBeenCalledTimes(1);
	});

	it("ends promptly when signal is already aborted before subscribing", async () => {
		const controller = new AbortController();
		controller.abort();
		const subscriber = makeSubscriber();
		subscriber.subscribe = vi.fn(() => new Promise(() => {}));
		redis.getRedis.mockReturnValue(redis);
		redis.duplicate.mockReturnValue(subscriber);

		const iterator = subscribeResumeUpdated({ resumeId: "r1", userId: "u1", signal: controller.signal });
		const nextPromise = iterator.next();
		const result = await Promise.race([
			nextPromise,
			new Promise((_, reject) => setTimeout(() => reject(new Error("HUNG")), 200)),
		]);

		expect(result).toEqual({ done: true, value: undefined });
		expect(subscriber.subscribe).not.toHaveBeenCalled();
	});

	it("ends cleanly when aborted with a custom error reason", async () => {
		const subscriber = makeSubscriber();
		redis.getRedis.mockReturnValue(redis);
		redis.duplicate.mockReturnValue(subscriber);
		const controller = new AbortController();
		const iterator = subscribeResumeUpdated({ resumeId: "r1", userId: "u1", signal: controller.signal });
		const nextPromise = iterator.next();
		await tick();
		controller.abort(new Error("custom cancellation"));
		expect(await nextPromise).toEqual({ done: true, value: undefined });
		expect(subscriber.disconnect).toHaveBeenCalledTimes(1);
	});
});
