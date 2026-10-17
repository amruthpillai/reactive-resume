// M6-T3 transport scenarios: the shipped send/resume helpers (apps/mobile/src/features/assistant/transport.ts) driven
// by the AI SDK's real `Chat` (the class `useChat` wraps), against mocked oRPC event iterators that yield the server's
// SSE strings. Run from the repository root:
//   rtk proxy node --import ./apps/server/node_modules/tsx/dist/loader.mjs docs/plans/native-mobile-app/reports/M6-T3/verify.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const mobile = resolve("apps/mobile");
const require = createRequire(`${mobile}/package.json`);
const { Chat } = await import(pathToFileURL(require.resolve("@ai-sdk/react")).href);
const { lastAssistantMessageIsCompleteWithToolCalls } = await import(pathToFileURL(require.resolve("ai")).href);
const { sendAgentMessage, resumeAgentStream } = await import(
	pathToFileURL(`${mobile}/src/features/assistant/transport.ts`).href
);
const { createRequestLane, recoverRun } = await import(pathToFileURL(`${mobile}/src/features/assistant/recovery.ts`).href);

const sse = (chunk) => `data: ${JSON.stringify(chunk)}\n\n`;
const reply = (id, words) => [
	{ type: "start", messageId: id },
	{ type: "start-step" },
	{ type: "text-start", id: "t1" },
	...words.map((delta) => ({ type: "text-delta", id: "t1", delta })),
	{ type: "text-end", id: "t1" },
	{ type: "finish-step" },
	{ type: "finish" },
];

/** An oRPC-style event iterator over SSE strings. */
function iterator(frames, { failAfter, hang, signal } = {}) {
	let index = 0;
	return {
		async next() {
			if (failAfter !== undefined && index === failAfter) throw new TypeError("Network request failed");
			if (index < frames.length) return { done: false, value: frames[index++] };
			if (hang)
				await new Promise((_, reject) => signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
			return { done: true, value: undefined };
		},
		async return() {
			return { done: true, value: undefined };
		},
	};
}

function harness({ send = () => iterator([]), resume = () => iterator([]), messages = [], idleMs }) {
	const calls = { send: [], resume: 0, resumeOptions: [] };
	const api = {
		send: async (input, options) => {
			calls.send.push({ input, options });
			return send(input, options);
		},
		resume: async (_input, options) => {
			calls.resume++;
			calls.resumeOptions.push(options);
			return resume(options);
		},
	};
	const context = { current: { document: true, posting: true } };
	// Same transport object as useAssistantChat in chat.ts.
	let chat;
	const transport = {
		resumeStreamIsReplay: true,
		sendMessages: (options) => sendAgentMessage(api, "thread-1", context.current, options),
		reconnectToStream: ({ abortSignal }) =>
			resumeAgentStream(api, "thread-1", {
				signal: abortSignal,
				messageById: (id) => chat.messages.find((message) => message.id === id),
				...(idleMs ? { idleMs } : {}),
			}),
	};
	chat = new Chat({
		id: "thread-1",
		messages,
		transport,
		sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
	});
	return { chat, calls, context };
}

const textOf = (message) =>
	message.parts
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join("");

const answered = {
	type: "tool-ask_user_question",
	toolCallId: "q1",
	state: "output-available",
	input: { question: "Netcode?" },
	output: "Yes, at Pixel Forge",
};


// As chat-view.tsx: background cancels the lane (detach), foreground queues recovery behind that detach.
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function lifecycle() {
	let open = true; // a reply is streaming when the app goes to the background
	const state = { app: "active", followed: 0 };
	const lane = createRequestLane({
		stop: async () => {
			await pause(30);
			open = false;
		},
		busy: () => open,
	});
	const background = () => {
		state.app = "background";
		const busy = lane.busy();
		const cancelled = lane.cancel();
		return busy ? cancelled : null;
	};
	const foreground = (detaching) => {
		state.app = "active";
		return lane.runAfter(detaching ?? Promise.resolve(), () => state.app === "active", async () => {
			state.followed++;
		});
	};
	return { lane, state, background, foreground };
}

const queuedRecovery = (intervene) => async () => {
	const { lane, state, background, foreground } = lifecycle();
	const queued = foreground(background());
	await intervene({ lane, background });
	await queued;
	await pause(50);
	assert.equal(state.followed, 0, "the queued recovery must not start");
};

const scenarios = {
	async "queued foreground recovery runs once the detach settled"() {
		const { state, background, foreground } = lifecycle();
		await foreground(background());
		assert.equal(state.followed, 1);
	},
	"queued foreground recovery is dropped after Stop": queuedRecovery(({ lane }) => lane.cancel()),
	"queued foreground recovery is dropped after unmount": queuedRecovery(({ lane }) => lane.cancel()),
	"queued foreground recovery is dropped after another background": queuedRecovery(({ background }) => background()),

	async "send: only the newest message, context read at send time, attachments, streamed reply"() {
		let turn = 0;
		const { chat, calls, context } = harness({
			send: () => iterator(reply(`a${++turn}`, ["Hello", " world"]).map(sse)),
		});
		await chat.sendMessage({ text: "First" });
		context.current = { document: false, posting: true, applicationId: "app-1" };
		await chat.sendMessage({ text: "Second" }, { body: { attachmentIds: ["att-1", 7] } });
		assert.equal(calls.send.length, 2);
		const last = calls.send[1].input;
		assert.equal(last.threadId, "thread-1");
		assert.equal(last.message.role, "user");
		assert.equal(textOf(last.message), "Second");
		assert.deepEqual(last.context, { document: false, posting: true, applicationId: "app-1" });
		assert.deepEqual(last.attachmentIds, ["att-1"]);
		assert.equal(calls.send[0].input.attachmentIds, undefined);
		assert.ok(calls.send[1].options.signal instanceof AbortSignal);
		assert.equal(chat.status, "ready");
		assert.equal(textOf(chat.messages.at(-1)), "Hello world");
	},

	async "send: SSE frames split across chunks and a malformed frame still give the whole reply"() {
		const joined = reply("a1", ["Split", " frames"]).map(sse).join("");
		const pieces = [joined.slice(0, 17), joined.slice(17, 60), "data: {not json}\n\n", joined.slice(60)];
		const warn = console.warn;
		const warnings = [];
		console.warn = (...args) => warnings.push(args.join(" "));
		try {
			const { chat } = harness({ send: () => iterator(pieces) });
			await chat.sendMessage({ text: "Go" });
			assert.equal(chat.status, "ready");
			assert.equal(textOf(chat.messages.at(-1)), "Split frames");
		} finally {
			console.warn = warn;
		}
		assert.equal(warnings.length, 1);
		assert.ok(!warnings[0].includes("not json"), "the dropped frame's content is never logged");
	},

	async "disconnect mid-reply, then resume continues from the server's stream"() {
		const frames = reply("a1", ["Most", " of", " your", " bullets"]).map(sse);
		const { chat, calls } = harness({
			send: () => iterator(frames, { failAfter: 4 }),
			resume: () => iterator(frames),
		});
		await chat.sendMessage({ text: "Find weak bullets" });
		assert.equal(chat.status, "error");
		assert.match(String(chat.error?.message), /Network request failed/);
		chat.clearError();
		await chat.resumeStream();
		assert.equal(calls.resume, 1);
		assert.equal(chat.status, "ready");
		const assistants = chat.messages.filter((message) => message.role === "assistant");
		assert.equal(textOf(assistants.at(-1)), "Most of your bullets");
		assert.equal(chat.messages.filter((message) => message.role === "user").length, 1, "nothing is sent again");
	},

	async "resume when nothing is running is a no-op"() {
		const { chat, calls } = harness({ send: () => iterator([]) });
		await chat.resumeStream();
		assert.equal(calls.resume, 1);
		assert.equal(chat.status, "ready");
		assert.equal(chat.messages.length, 0);
	},

	async "stop aborts the request; the partial reply stays"() {
		const { chat, calls } = harness({
			send: (_input, options) =>
				iterator(reply("a1", ["Partial"]).slice(0, 4).map(sse), { hang: true, signal: options.signal }),
		});
		const sending = chat.sendMessage({ text: "Go" });
		await new Promise((resolve) => setTimeout(resolve, 50));
		assert.equal(chat.status, "streaming");
		await chat.stop();
		await sending;
		assert.equal(calls.send[0].options.signal.aborted, true);
		assert.equal(chat.status, "ready");
		assert.equal(textOf(chat.messages.at(-1)), "Partial");
	},

	async "resuming a continuation keeps the parts from before the run and replaces only the replayed ones"() {
		const before = {
			id: "a1",
			role: "assistant",
			parts: [{ type: "step-start" }, { type: "text", text: "Before the question.", state: "done" }, answered],
		};
		// The server replays the continuation run of a1 from its start.
		const run = reply("a1", ["After", " the answer."]).map(sse);
		const { chat } = harness({
			messages: [{ id: "u1", role: "user", parts: [{ type: "text", text: "Tailor it" }] }, before],
			resume: () => iterator(run),
		});
		// The client already showed part of the run before the connection dropped.
		chat.messages = [
			chat.messages[0],
			{ ...before, parts: [...before.parts, { type: "step-start" }, { type: "text", text: "After", state: "streaming" }] },
		];
		await chat.resumeStream();
		assert.equal(chat.status, "ready");
		assert.equal(chat.messages.length, 2);
		const message = chat.messages[1];
		const texts = message.parts.filter((part) => part.type === "text").map((part) => part.text);
		assert.deepEqual(texts, ["Before the question.", "After the answer."]);
		const question = message.parts.find((part) => part.type === "tool-ask_user_question");
		assert.equal(question?.output, "Yes, at Pixel Forge");
	},

	async "resuming keeps what the earlier run wrote after the question, and a whole message with no new step yet"() {
		const before = {
			id: "a1",
			role: "assistant",
			parts: [
				{ type: "step-start" },
				{ type: "text", text: "Before the question.", state: "done" },
				answered,
				// Written by the earlier run in the same step, after the question.
				{ type: "text", text: "Trailing note.", state: "done" },
			],
		};
		const user = { id: "u1", role: "user", parts: [{ type: "text", text: "Tailor it" }] };
		for (const shown of [
			before,
			{ ...before, parts: [...before.parts, { type: "step-start" }, { type: "text", text: "After", state: "streaming" }] },
		]) {
			const { chat } = harness({ messages: [user, shown], resume: () => iterator(reply("a1", ["After", " the answer."]).map(sse)) });
			await chat.resumeStream();
			const texts = chat.messages[1].parts.filter((part) => part.type === "text").map((part) => part.text);
			assert.deepEqual(texts, ["Before the question.", "Trailing note.", "After the answer."]);
			assert.equal(chat.messages[1].parts.find((part) => part.type === "tool-ask_user_question")?.output, "Yes, at Pixel Forge");
		}
	},

	async "after a quiet resume ends, recovery resumes again until the server says the run finished"() {
		let resumes = 0;
		const full = reply("a1", ["Slow", " but", " done"]).map(sse);
		const { chat } = harness({
			idleMs: 50,
			// First resume: the server is slow, so it goes quiet; second: the reply arrives and finishes.
			resume: (options) =>
				++resumes === 1 ? iterator(full.slice(0, 4), { hang: true, signal: options.signal }) : iterator(full),
		});
		const user = { id: "u1", role: "user", parts: [{ type: "text", text: "Go" }] };
		const saved = [user, { id: "a1", role: "assistant", parts: [{ type: "text", text: "Slow but done" }] }];
		const reloads = [{ messages: [user], active: true }, { messages: [user], active: true }, { messages: saved, active: false }];
		const applied = [];
		await recoverRun({
			isCurrent: () => true,
			reload: async () => reloads.shift() ?? null,
			apply: (messages) => {
				applied.push(messages);
				chat.messages = messages;
			},
			resume: () => chat.resumeStream(),
			sleep: () => Promise.resolve(),
		});
		assert.equal(resumes, 2);
		assert.equal(applied.length, 3);
		assert.equal(textOf(chat.messages.at(-1)), "Slow but done");
		assert.equal(chat.status, "ready");
	},

	async "recovery that was moved on (unmount, background) touches nothing after its await"() {
		for (const at of ["reload", "resume"]) {
			let generation = 0;
			const token = ++generation;
			const calls = { reload: 0, apply: 0, resume: 0 };
			await recoverRun({
				isCurrent: () => token === generation,
				reload: async () => {
					calls.reload++;
					if (at === "reload") generation++;
					return { messages: [], active: true };
				},
				apply: () => calls.apply++,
				resume: async () => {
					calls.resume++;
					generation++;
				},
				sleep: () => Promise.resolve(),
			});
			if (at === "reload") assert.deepEqual(calls, { reload: 1, apply: 0, resume: 0 });
			else assert.deepEqual(calls, { reload: 1, apply: 1, resume: 1 });
		}
	},

	async "one request at a time: no recovery during a send, a new send waits for the old one, Stop aborts all"() {
		let open = 0;
		let most = 0;
		const track = (it, signal) => {
			open++;
			most = Math.max(most, open);
			let closed = false;
			const close = () => {
				if (!closed) open--;
				closed = true;
			};
			signal?.addEventListener("abort", close);
			return {
				next: async () => {
					const result = await it.next().catch((error) => {
						close();
						throw error;
					});
					if (result.done) close();
					return result;
				},
				return: async () => {
					close();
					return it.return();
				},
			};
		};
		let sends = 0;
		const { chat, calls } = harness({
			send: (_input, options) =>
				track(
					++sends === 1
						? iterator(reply("a1", ["First"]).slice(0, 4).map(sse), { hang: true, signal: options.signal })
						: iterator(reply("a2", ["Second"]).map(sse)),
					options.signal,
				),
			resume: (options) =>
				track(iterator(reply("a3", ["Resumed"]).slice(0, 4).map(sse), { hang: true, signal: options.signal }), options.signal),
		});
		const lane = createRequestLane({
			stop: () => chat.stop(),
			busy: () => chat.status === "submitted" || chat.status === "streaming",
		});
		const first = lane.run(() => chat.sendMessage({ text: "One" }));
		await new Promise((resolve) => setTimeout(resolve, 30));
		assert.equal(chat.status, "streaming");

		// A thread refresh that says a run is active must not start recovery while the send is open.
		let recovered = 0;
		await lane.runIfIdle(async () => {
			recovered++;
			await chat.resumeStream();
		});
		assert.equal(recovered, 0);
		assert.equal(calls.resume, 0);

		// A new send cancels and awaits the first before its own request starts.
		await lane.run(() => chat.sendMessage({ text: "Two" }));
		await first;
		assert.equal(calls.send[0].options.signal.aborted, true);
		assert.equal(calls.send.length, 2);
		assert.equal(textOf(chat.messages.at(-1)), "Second");

		// Recovery now runs (idle), and Stop aborts it.
		const following = lane.runIfIdle(() => chat.resumeStream());
		await new Promise((resolve) => setTimeout(resolve, 30));
		assert.equal(calls.resume, 1);
		assert.equal(lane.busy(), true);
		await lane.cancel();
		await following;
		assert.equal(calls.resumeOptions[0].signal.aborted, true);
		assert.equal(lane.busy(), false);
		assert.equal(most, 1, "two requests were never open at once");
	},

	async "stop cancels a resumed stream: the abort signal reaches agent.messages.resume"() {
		const { chat, calls } = harness({
			resume: (options) => iterator(reply("a1", ["Going"]).slice(0, 4).map(sse), { hang: true, signal: options.signal }),
		});
		const resuming = chat.resumeStream();
		await new Promise((resolve) => setTimeout(resolve, 50));
		assert.equal(chat.status, "streaming");
		await chat.stop();
		await resuming;
		assert.ok(calls.resumeOptions[0].signal instanceof AbortSignal);
		assert.equal(calls.resumeOptions[0].signal.aborted, true);
		assert.equal(chat.status, "ready");
	},

	async "a resumed stream that goes quiet ends instead of hanging"() {
		const { chat, calls } = harness({
			idleMs: 100,
			resume: (options) => iterator(reply("a1", ["Stuck"]).slice(0, 4).map(sse), { hang: true, signal: options.signal }),
		});
		const started = Date.now();
		await chat.resumeStream();
		assert.ok(Date.now() - started < 2000);
		assert.equal(calls.resumeOptions[0].signal.aborted, true);
		assert.notEqual(chat.status, "streaming");
		assert.equal(textOf(chat.messages.at(-1)), "Stuck");
	},

	async "answering the assistant's question continues the reply with the tool output"() {
		const question = [
			{ type: "start", messageId: "a1" },
			{ type: "start-step" },
			{ type: "tool-input-available", toolCallId: "q1", toolName: "ask_user_question", input: { question: "Netcode?" } },
			{ type: "finish-step" },
			{ type: "finish" },
		];
		let turn = 0;
		const { chat, calls } = harness({
			send: () => iterator((turn++ === 0 ? question : reply("a1", ["Thanks"])).map(sse)),
		});
		await chat.sendMessage({ text: "Tailor it" });
		await chat.addToolOutput({ tool: "ask_user_question", toolCallId: "q1", output: "Yes, at Pixel Forge" });
		await new Promise((resolve) => setTimeout(resolve, 50));
		assert.equal(calls.send.length, 2);
		const sent = calls.send[1].input.message;
		assert.equal(sent.role, "assistant");
		const part = sent.parts.find((item) => item.type === "tool-ask_user_question");
		assert.equal(part.output, "Yes, at Pixel Forge");
	},
};

let failed = 0;
for (const [name, run] of Object.entries(scenarios)) {
	try {
		await run();
		console.log(`pass  ${name}`);
	} catch (error) {
		failed++;
		console.log(`FAIL  ${name}\n      ${error?.stack ?? error}`);
	}
}
console.log(`\n${Object.keys(scenarios).length - failed}/${Object.keys(scenarios).length} scenarios passed`);
process.exit(failed ? 1 : 0);
