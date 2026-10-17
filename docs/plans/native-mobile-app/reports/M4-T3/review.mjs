import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const bytes = new Uint8Array([37, 80, 68, 70]);
const events = [];
let fontFailure = null;
const fixture = {
	File: class {
		constructor(directory, name) {
			this.uri = `${directory.uri}/${name}`;
		}
		async write(value) {
			events.push({ kind: "write", uri: this.uri, bytes: value });
		}
	},
	Directory: class {
		constructor(_parent, name) {
			this.uri = `cache/${name}`;
		}
		create() {}
	},
	Paths: { cache: { list: () => [] } },
	printAsync: async ({ uri }) => {
		events.push({ kind: "print", uri });
	},
	isAvailableAsync: async () => true,
	shareAsync: async (uri) => {
		events.push({ kind: "share", uri });
	},
	showToast: (options) => {
		events.push({ kind: "warning", ...options });
	},
	createPreviewPipeline: () => ({
		render: async () => {
			if (fontFailure) throw fontFailure;
			return { pdf: bytes, lostCharacters: ['"₹" (U+20B9)'], hasTextLoss: true };
		},
		dispose: async () => {
			events.push({ kind: "dispose" });
		},
	}),
	getResumeExportData: (data) => data,
	client: { coverLetters: { getById: async () => ({ style: { metadata: { page: { locale: "fr-FR" } } } }) } },
	letterWords: async (locale) => {
		events.push({ kind: "locale", locale });
		return {
			greeting: (name) => `Bonjour ${name},`,
			teamGreeting: "Bonjour à l’équipe,",
			hiringTeam: "Équipe",
			signOff: "Cordialement,",
		};
	},
	rest: async (path) => {
		events.push({ kind: "rest", path });
		return { ok: true, arrayBuffer: async () => bytes.buffer };
	},
	t: (strings, ...values) => strings.reduce((text, part, index) => text + part + (values[index] ?? ""), ""),
	plural: (count, options) => (count === 1 ? options.one : options.other),
};
globalThis.__m4t3Review = fixture;
const mocks = {
	"expo-file-system": ["File", "Directory", "Paths"],
	"expo-print": ["printAsync"],
	"expo-sharing": ["isAvailableAsync", "shareAsync"],
	"@/ui": ["showToast"],
	"@/preview/pipeline": ["createPreviewPipeline"],
	"@reactive-resume/resume/export-sections": ["getResumeExportData"],
	"@/api/client": ["rest", "client"],
	"./letter": ["letterWords"],
	"@lingui/core/macro": ["t", "plural"],
};
const hook = registerHooks({
	resolve(specifier, context, next) {
		if (mocks[specifier])
			return {
				url: `data:text/javascript,${encodeURIComponent(mocks[specifier].map((name) => `export const ${name} = globalThis.__m4t3Review.${name};`).join("\n"))}`,
				shortCircuit: true,
			};
		if (context.parentURL?.includes("/features/share/") && specifier.startsWith(".")) {
			return { url: new URL(`${specifier}.ts`, context.parentURL).href, shortCircuit: true };
		}
		return next(specifier, context);
	},
});
let failed = 0,
	passed = 0;
const { exportFile, localPdf, printResume, shareExport } =
	await import("../../../../../apps/mobile/src/features/share/files.ts");
async function check(name, action) {
	events.length = 0;
	try {
		await action();
		passed++;
		console.log(`PASS ${name}`);
	} catch (error) {
		failed++;
		console.error(`FAIL ${name}: ${error.message}`);
	}
}
const data = { metadata: { page: { locale: "fr-FR" } } };
await check("PDF bytes and lost characters remain available", async () => {
	const result = await localPdf(data);
	assert.deepEqual(result.pdf, bytes);
	assert.deepEqual(result.lostCharacters, ['"₹" (U+20B9)']);
	assert.ok(events.some((event) => event.kind === "dispose"));
});
for (const letter of [false, true])
	await check(`lost characters warn and allow offline ${letter ? "letter" : "resume"} share`, async () => {
		const file = await exportFile({
			directory: { uri: "cache" },
			id: "resume",
			name: "Resume",
			format: "pdf",
			data,
			letter,
		});
		await shareExport(file, "pdf");
		assert.deepEqual(events.find((event) => event.kind === "write").bytes, bytes);
		assert.match(events.find((event) => event.kind === "warning").message, /₹/);
		assert.ok(events.some((event) => event.kind === "share"));
		assert.equal(
			events.some((event) => event.kind === "rest"),
			false,
		);
	});
await check("lost characters warn and allow print", async () => {
	await printResume(data, "Resume");
	assert.match(events.find((event) => event.kind === "warning").message, /₹/);
	assert.ok(events.some((event) => event.kind === "print"));
});
for (const format of ["docx", "odt", "md"])
	await check(`${format} sends localized words as JSON query`, async () => {
		await exportFile({ directory: { uri: "cache" }, id: "letter /1", name: "Letter", format, letter: true });
		const path = events.find((event) => event.kind === "rest").path;
		const url = new URL(path, "https://example.invalid");
		assert.equal(url.pathname, `/cover-letters/letter%20%2F1/exports/${format}`);
		assert.deepEqual(JSON.parse(url.searchParams.get("words")), {
			greeting: "Bonjour {name},",
			teamGreeting: "Bonjour à l’équipe,",
			hiringTeam: "Équipe",
			signOff: "Cordialement,",
		});
		assert.equal(events.find((event) => event.kind === "locale").locale, "fr-FR");
	});
await check("letter JSON requires no words", async () => {
	await exportFile({ directory: { uri: "cache" }, id: "letter", name: "Letter", format: "json", letter: true });
	assert.equal(events.find((event) => event.kind === "rest").path, "/cover-letters/letter/exports/json");
	assert.equal(
		events.some((event) => event.kind === "locale"),
		false,
	);
});
await check("missing fonts still block handoff and dispose renderer", async () => {
	fontFailure = new Error("Fonts could not be loaded.", { cause: "pdf-text-loss" });
	await assert.rejects(
		() => printResume(data, "Resume"),
		(error) => error === fontFailure,
	);
	assert.ok(events.some((event) => event.kind === "dispose"));
	assert.equal(
		events.some((event) => ["write", "print", "share"].includes(event.kind)),
		false,
	);
	fontFailure = null;
});
hook.deregister();
delete globalThis.__m4t3Review;
console.log(`${passed} passed, ${failed} failed export review scenarios`);
if (failed) process.exitCode = 1;
