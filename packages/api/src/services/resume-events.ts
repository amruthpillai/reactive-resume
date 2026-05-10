import { getPool } from "@reactive-resume/db/client";

const RESUME_UPDATED_CHANNEL = "resume_updated";

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
		typeof event.mutation === "string"
	);
}

export async function publishResumeUpdated(event: ResumeUpdatedEvent) {
	await getPool().query("SELECT pg_notify($1, $2)", [RESUME_UPDATED_CHANNEL, JSON.stringify(event)]);
}

export async function* subscribeResumeUpdated({ resumeId, userId, signal }: SubscribeResumeUpdatedInput) {
	const client = await getPool().connect();
	const queue: ResumeUpdatedEvent[] = [];
	let done = signal?.aborted ?? false;
	let wake: (() => void) | undefined;

	const resolveWake = () => {
		wake?.();
		wake = undefined;
	};

	const onAbort = () => {
		done = true;
		resolveWake();
	};

	const onNotification = (notification: PgNotification) => {
		if (notification.channel !== RESUME_UPDATED_CHANNEL || !notification.payload) return;

		try {
			const event = JSON.parse(notification.payload) as unknown;
			if (!isResumeUpdatedEvent(event)) return;
			if (event.resumeId !== resumeId || event.userId !== userId) return;

			queue.push(event);
			resolveWake();
		} catch {
			// Ignore malformed notifications; the refetch path is invalidation-only.
		}
	};

	signal?.addEventListener("abort", onAbort, { once: true });
	client.on("notification", onNotification);

	try {
		await client.query(`LISTEN ${RESUME_UPDATED_CHANNEL}`);

		while (!done) {
			const event = queue.shift();
			if (event) {
				yield event;
				continue;
			}

			await new Promise<void>((resolve) => {
				wake = resolve;
			});
		}
	} finally {
		signal?.removeEventListener("abort", onAbort);
		client.off("notification", onNotification);

		try {
			await client.query(`UNLISTEN ${RESUME_UPDATED_CHANNEL}`);
		} finally {
			client.release();
		}
	}
}
