import { describe, expect, it, vi } from "vitest";

const pool = vi.hoisted(() => ({
	query: vi.fn().mockResolvedValue(undefined),
	connect: vi.fn(),
}));

vi.mock("@reactive-resume/db/client", () => ({ getPool: () => pool }));

const { publishResumeUpdated, subscribeResumeUpdated } = await import("./resume-events");

const exampleEvent = {
	type: "resume.updated" as const,
	resumeId: "r1",
	userId: "u1",
	updatedAt: "2024-01-01T00:00:00Z",
	mutation: "patch" as const,
};

describe("publishResumeUpdated", () => {
	it("issues a pg_notify with the channel and serialized event", async () => {
		pool.query.mockClear();

		await publishResumeUpdated(exampleEvent);

		expect(pool.query).toHaveBeenCalledTimes(1);
		// biome-ignore lint/style/noNonNullAssertion: The assertion above verifies the query call exists before destructuring it.
		const [sql, params] = pool.query.mock.calls[0]!;
		expect(sql).toBe("SELECT pg_notify($1, $2)");
		expect(params?.[0]).toBe("resume_updated");
		expect(JSON.parse(params?.[1] as string)).toEqual(exampleEvent);
	});
});

const makeFakeClient = () => {
	type Listener = (notification: { channel?: string; payload?: string }) => void;
	const listeners = new Set<Listener>();

	const client = {
		query: vi.fn().mockResolvedValue(undefined),
		on: vi.fn((event: string, fn: Listener) => {
			if (event === "notification") listeners.add(fn);
		}),
		off: vi.fn((event: string, fn: Listener) => {
			if (event === "notification") listeners.delete(fn);
		}),
		release: vi.fn(),
		__notify(channel: string, payload: string) {
			for (const fn of listeners) fn({ channel, payload });
		},
	};
	return client;
};

describe("subscribeResumeUpdated", () => {
	it("yields events whose resumeId and userId match the subscription", async () => {
		const client = makeFakeClient();
		pool.connect.mockResolvedValueOnce(client);

		const controller = new AbortController();
		const iterator = subscribeResumeUpdated({
			resumeId: "r1",
			userId: "u1",
			signal: controller.signal,
		});

		// Kick the generator so listeners are installed, then push a notification.
		const firstP = iterator.next();
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();

		client.__notify("resume_updated", JSON.stringify(exampleEvent));

		const first = await firstP;
		expect(first.done).toBe(false);
		expect(first.value).toEqual(exampleEvent);

		controller.abort();
		const last = await iterator.next();
		expect(last.done).toBe(true);

		expect(client.query).toHaveBeenCalledWith("LISTEN resume_updated");
		expect(client.query).toHaveBeenCalledWith("UNLISTEN resume_updated");
		expect(client.release).toHaveBeenCalled();
	});

	it("ignores notifications for other resumes / users", async () => {
		const client = makeFakeClient();
		pool.connect.mockResolvedValueOnce(client);

		const controller = new AbortController();
		const iterator = subscribeResumeUpdated({
			resumeId: "r1",
			userId: "u1",
			signal: controller.signal,
		});

		const resultP = iterator.next();
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();

		client.__notify("resume_updated", JSON.stringify({ ...exampleEvent, resumeId: "other" }));
		client.__notify("resume_updated", JSON.stringify({ ...exampleEvent, userId: "other" }));
		client.__notify("resume_updated", JSON.stringify(exampleEvent));

		const result = await resultP;
		expect(result.value?.resumeId).toBe("r1");

		controller.abort();
		await iterator.next();
	});

	it("ignores malformed notifications and notifications on other channels", async () => {
		const client = makeFakeClient();
		pool.connect.mockResolvedValueOnce(client);

		const controller = new AbortController();
		const iterator = subscribeResumeUpdated({
			resumeId: "r1",
			userId: "u1",
			signal: controller.signal,
		});

		const resultP = iterator.next();
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();

		// Wrong channel.
		client.__notify("other_channel", JSON.stringify(exampleEvent));
		// Malformed JSON.
		client.__notify("resume_updated", "{not-json");
		// Missing required fields.
		client.__notify("resume_updated", JSON.stringify({ type: "wrong" }));
		// Valid event after the noise.
		client.__notify("resume_updated", JSON.stringify(exampleEvent));

		const result = await resultP;
		expect(result.value).toEqual(exampleEvent);

		controller.abort();
		await iterator.next();
	});

	it("terminates immediately if signal is already aborted", async () => {
		const client = makeFakeClient();
		pool.connect.mockResolvedValueOnce(client);

		const controller = new AbortController();
		controller.abort();

		const iterator = subscribeResumeUpdated({
			resumeId: "r1",
			userId: "u1",
			signal: controller.signal,
		});

		const result = await iterator.next();
		expect(result.done).toBe(true);
	});
});
