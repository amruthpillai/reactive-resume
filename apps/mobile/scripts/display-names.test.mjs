// Run: node --test apps/mobile/scripts/display-names.test.mjs
// Hermes has no Intl.DisplayNames, so country names on the device come from the polyfill src/polyfills.ts loads.
// This removes the engine's own, loads exactly the intl-displaynames modules polyfills.ts imports, in its order, and
// checks that countryName then gives localized names for every catalog the app ships.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";

// @reactive-resume/utils is TypeScript with extensionless relative imports; Node strips the types itself.
registerHooks({
	resolve(specifier, context, next) {
		try {
			return next(specifier, context);
		} catch (error) {
			if (specifier.startsWith(".")) return next(`${specifier}.ts`, context);
			throw error;
		}
	},
});

test("polyfills.ts gives countryName localized names without a native Intl.DisplayNames", async () => {
	delete Intl.DisplayNames;
	const { countryName } = await import("@reactive-resume/utils/region");
	assert.equal(countryName("DE", "de-DE"), "DE", "the engine should start without Intl.DisplayNames");

	const polyfills = readFileSync(new URL("../src/polyfills.ts", import.meta.url), "utf8");
	const modules = polyfills
		.split("\n")
		.map((line) => line.trim().match(/^import "(@formatjs\/intl-displaynames\/[^"]+)";$/)?.[1])
		.filter(Boolean);
	assert.ok(modules.includes("@formatjs/intl-displaynames/polyfill.js"), "polyfills.ts must load the polyfill");
	for (const specifier of modules) await import(specifier);

	assert.equal(countryName("DE", "de-DE"), "Deutschland");
	assert.equal(countryName("DE", "zh-TW"), "德國");
	assert.equal(countryName("DE", "sr-SP"), "Немачка");
	const catalogs = readdirSync(new URL("../locales/", import.meta.url)).filter((file) => file.endsWith(".po"));
	const unnamed = catalogs.map((file) => file.slice(0, -3)).filter((locale) => countryName("DE", locale) === "DE");
	assert.deepEqual(unnamed, [], "every catalog locale should name the country");
});
