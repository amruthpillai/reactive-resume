import { createDecipheriv, createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const localeDir = join(rootDir, "apps", "web", "locales");
const requireFromServer = createRequire(join(rootDir, "apps", "server", "package.json"));
const { Client } = requireFromServer("pg");

const localeNames = {
	"af-ZA": "Afrikaans",
	"am-ET": "Amharic",
	"ar-SA": "Arabic",
	"az-AZ": "Azerbaijani",
	"bg-BG": "Bulgarian",
	"bn-BD": "Bengali",
	"ca-ES": "Catalan",
	"cs-CZ": "Czech",
	"da-DK": "Danish",
	"de-DE": "German",
	"el-GR": "Greek",
	"en-GB": "British English",
	"es-ES": "Spanish",
	"fa-IR": "Persian",
	"fi-FI": "Finnish",
	"fr-FR": "French",
	"he-IL": "Hebrew",
	"hi-IN": "Hindi",
	"hu-HU": "Hungarian",
	"id-ID": "Indonesian",
	"it-IT": "Italian",
	"ja-JP": "Japanese",
	"km-KH": "Khmer",
	"kn-IN": "Kannada",
	"ko-KR": "Korean",
	"lt-LT": "Lithuanian",
	"lv-LV": "Latvian",
	"ml-IN": "Malayalam",
	"mr-IN": "Marathi",
	"ms-MY": "Malay",
	"ne-NP": "Nepali",
	"nl-NL": "Dutch",
	"no-NO": "Norwegian Bokmal",
	"or-IN": "Odia",
	"pl-PL": "Polish",
	"pt-BR": "Brazilian Portuguese",
	"pt-PT": "European Portuguese",
	"ro-RO": "Romanian",
	"ru-RU": "Russian",
	"sk-SK": "Slovak",
	"sl-SI": "Slovenian",
	"sq-AL": "Albanian",
	"sr-SP": "Serbian",
	"sv-SE": "Swedish",
	"ta-IN": "Tamil",
	"te-IN": "Telugu",
	"th-TH": "Thai",
	"tr-TR": "Turkish",
	"uk-UA": "Ukrainian",
	"uz-UZ": "Uzbek",
	"vi-VN": "Vietnamese",
	"zh-CN": "Simplified Chinese",
	"zh-TW": "Traditional Chinese",
	"zu-ZA": "Zulu",
};

function loadEnvFile(filePath) {
	const values = {};
	const contents = readFileSync(filePath, "utf8");

	for (const line of contents.split(/\r?\n/)) {
		const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
		if (!match) continue;

		const [, rawName, rawValue] = match;
		const name = rawName.trim();
		let value = rawValue.trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		values[name] = value;
	}

	return values;
}

function decode(value) {
	return Buffer.from(value, "base64url");
}

function decryptCredential(payload, secret) {
	const [version, encodedIv, encodedAuthTag, encodedCiphertext] = payload.split(".");
	if (version !== "v1" || !encodedIv || !encodedAuthTag || !encodedCiphertext) {
		throw new Error("Invalid encrypted credential payload.");
	}

	const key = createHash("sha256").update(secret).digest();
	const decipher = createDecipheriv("aes-256-gcm", key, decode(encodedIv));
	decipher.setAuthTag(decode(encodedAuthTag));

	return Buffer.concat([decipher.update(decode(encodedCiphertext)), decipher.final()]).toString("utf8");
}

function unescapePo(value) {
	return value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function escapePo(value) {
	return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function readPoString(lines, startIndex) {
	const initial = lines[startIndex].match(/^msg(?:id|str)\s+"(.*)"$/);
	if (!initial) return null;

	let value = unescapePo(initial[1]);
	let endIndex = startIndex;

	for (let index = startIndex + 1; index < lines.length; index++) {
		const match = lines[index].match(/^"(.*)"$/);
		if (!match) break;

		value += unescapePo(match[1]);
		endIndex = index;
	}

	return { value, endIndex };
}

function parsePo(contents) {
	const normalized = contents.replace(/\r\n/g, "\n");

	return normalized.split(/\n\n+/).map((block) => {
		const lines = block.split("\n");
		const msgidIndex = lines.findIndex((line) => line.startsWith("msgid "));
		const msgstrIndex = lines.findIndex((line) => line.startsWith("msgstr "));
		const msgid = msgidIndex >= 0 ? readPoString(lines, msgidIndex)?.value : null;
		const msgstr = msgstrIndex >= 0 ? readPoString(lines, msgstrIndex)?.value : null;

		return { block, msgid, msgstr };
	});
}

function replaceBlockTranslation(block, translation) {
	return block.replace(/msgstr ""/, `msgstr "${escapePo(translation)}"`);
}

async function getOpenAiProvider(env) {
	if (!env.DATABASE_URL) throw new Error("DATABASE_URL is missing.");
	if (!env.ENCRYPTION_SECRET) throw new Error("ENCRYPTION_SECRET is missing.");

	const client = new Client({ connectionString: env.DATABASE_URL });
	await client.connect();

	try {
		const result = await client.query(
			`
				select provider, model, base_url, encrypted_api_key
				from ai_providers
				where enabled = true and test_status = 'success' and provider = 'openai'
				order by coalesce(last_used_at, created_at) desc
				limit 1
			`,
		);

		const provider = result.rows[0];
		if (!provider) throw new Error("No tested and enabled OpenAI provider was found.");

		return {
			model: provider.model || "gpt-4o-mini",
			baseUrl: provider.base_url || "https://api.openai.com/v1",
			apiKey: decryptCredential(provider.encrypted_api_key, env.ENCRYPTION_SECRET),
		};
	} finally {
		await client.end();
	}
}

function extractJsonObject(text) {
	const trimmed = text.trim();
	if (trimmed.startsWith("{") && trimmed.endsWith("}")) return JSON.parse(trimmed);

	const first = trimmed.indexOf("{");
	const last = trimmed.lastIndexOf("}");
	if (first === -1 || last === -1 || last < first) throw new Error("Model did not return JSON.");

	return JSON.parse(trimmed.slice(first, last + 1));
}

async function translateBatch({ provider, locale, languageName, entries }) {
	const input = entries.map((entry, id) => ({ id, text: entry.msgid }));
	const response = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${provider.apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: provider.model,
			temperature: 0,
			response_format: { type: "json_object" },
			messages: [
				{
					role: "system",
					content: [
						`You are a professional software localization translator for ${languageName}.`,
						"Translate UI strings naturally for a commercial resume builder.",
						"Preserve placeholders such as {selectedLabel}, ICU syntax, HTML-like tags such as <0>, and product names such as Reactive Resume, GitHub, Crowdin, LinkedIn, ATS, CV, and AI unless the language commonly transliterates them.",
						'Return only JSON shaped like {"translations":[{"id":0,"text":"..."}]} with every id translated.',
					].join(" "),
				},
				{ role: "user", content: JSON.stringify({ locale, languageName, strings: input }) },
			],
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`OpenAI translation failed for ${locale}: ${response.status} ${body.slice(0, 500)}`);
	}

	const data = await response.json();
	const content = data.choices?.[0]?.message?.content;
	if (typeof content !== "string") throw new Error(`OpenAI returned no content for ${locale}.`);

	const parsed = extractJsonObject(content);
	const translations = Array.isArray(parsed.translations) ? parsed.translations : [];
	const byId = new Map();

	for (const item of translations) {
		if (typeof item?.id !== "number" || typeof item?.text !== "string" || item.text.trim() === "") continue;
		byId.set(item.id, item.text.trim());
	}

	const missingIds = input.filter((item) => !byId.has(item.id)).map((item) => item.id);
	if (missingIds.length > 0) throw new Error(`OpenAI response for ${locale} missed ids: ${missingIds.join(", ")}`);

	return entries.map((entry, id) => ({ ...entry, translation: byId.get(id) }));
}

async function main() {
	const env = { ...loadEnvFile(join(rootDir, ".env.local")), ...process.env };
	const provider = await getOpenAiProvider(env);
	const locales = Object.keys(localeNames);

	for (const locale of locales) {
		const filePath = join(localeDir, `${locale}.po`);
		const contents = readFileSync(filePath, "utf8");
		const blocks = parsePo(contents);
		const missing = blocks
			.map((entry, index) => ({ ...entry, index }))
			.filter((entry) => entry.msgid && entry.msgid !== "" && entry.msgstr === "");

		if (missing.length === 0) {
			console.log(`${locale}: no missing strings`);
			continue;
		}

		console.log(`${locale}: translating ${missing.length} strings`);
		const translated = await translateBatch({
			provider,
			locale,
			languageName: localeNames[locale],
			entries: missing,
		});

		const nextBlocks = [...blocks];
		for (const entry of translated) {
			nextBlocks[entry.index] = {
				...nextBlocks[entry.index],
				block: replaceBlockTranslation(entry.block, entry.translation),
				msgstr: entry.translation,
			};
		}

		writeFileSync(
			filePath,
			`${nextBlocks
				.map((entry) => entry.block)
				.join("\n\n")
				.trimEnd()}\n`,
			"utf8",
		);
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
