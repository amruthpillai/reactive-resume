#!/usr/bin/env node
// design-sync CSS build: compile the UI package's Tailwind v4 globals.css to
// static CSS, then make it self-contained for preview rendering by inlining the
// IBM Plex Sans (latin) variable webfont as a data-URI and dropping the other
// @font-face rules (extra scripts + the Phosphor icon font, which previews
// don't use — components render Phosphor as inline React SVGs).
//
// Output: packages/ui/.ds-compiled.css  (cfg.cssEntry, bounded to the package)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");

// pnpm doesn't self-install the workspace package into its own node_modules,
// but the design-sync converter resolves the DS as node_modules/<pkg>. Create
// the self-symlink so PKG_DIR resolves and esbuild finds @reactive-resume/ui/*
// self-imports. Mirrors the sibling symlinks pnpm already writes (utils, config).
const selfLink = resolve(repo, "packages/ui/node_modules/@reactive-resume/ui");
if (!existsSync(selfLink)) symlinkSync("../../../ui", selfLink);

// Emit real .d.ts declarations (the package is source-consumed with no build).
// The converter's findTypesRoot picks up dist/types, giving components real
// prop contracts (variant/size unions, inherited Base UI props) instead of the
// weak `{[key]: unknown}` synth-entry fallback.
execFileSync(resolve(repo, "node_modules/.bin/tsc"), ["-p", "tsconfig.emit.json"], {
	cwd: resolve(repo, "packages/ui"),
	stdio: "inherit",
});
// NOTE: a barrel index.d.ts + publishConfig.types was tried to give the prop
// extractor an entry for components with inline param types — but resolving all
// 200+ inline Base UI param types through ts-morph's checker hangs the build
// (many minutes). Reverted. Components with a named <Name>Props source type
// (e.g. Button) still extract real props from dist/types; the rest fall back to
// the honest `{[key]: unknown}` contract, with usage carried by the preview +
// .prompt.md. See .design-sync/NOTES.md "Re-sync risks".
const cli = resolve(repo, ".ds-sync/node_modules/.bin/tailwindcss");
const entry = resolve(here, "tw-entry.css");
const tmp = resolve(repo, "packages/ui/.ds-tw-raw.css");
const out = resolve(repo, "packages/ui/.ds-compiled.css");
const font = resolve(
	repo,
	"packages/ui/node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2",
);

execFileSync(cli, ["-i", entry, "-o", tmp], { stdio: "inherit" });

let css = readFileSync(tmp, "utf8");
css = css.replace(/@font-face\s*\{[^}]*\}/g, ""); // drop all shipped @font-face
const b64 = readFileSync(font).toString("base64");
const face = `@font-face{font-family:"IBM Plex Sans Variable";font-style:normal;font-weight:100 700;font-display:swap;src:url(data:font/woff2;base64,${b64}) format("woff2-variations")}\n`;
writeFileSync(out, face + css);
console.error(`  build-css: wrote ${out} (${(Buffer.byteLength(face + css) / 1024).toFixed(0)} KB, font inlined)`);
