#!/usr/bin/env node
// Replace `@reactive-resume/*` workspace symlinks with Windows junctions.
//
// `pnpm install` runs inside a Linux Docker container in this project's local-dev
// flow (see `just install`). The symlinks it creates for workspace packages have
// permissions that make Node's `lstat` fail with EACCES on Windows — TypeScript
// then reports phantom "Cannot find module '@reactive-resume/...'" errors even
// though bash `ls` traverses the same paths fine.
//
// Junctions (Node's `symlinkSync(target, path, 'junction')`) are Windows-native
// directory links that don't require Developer Mode or admin rights and that
// Node can lstat without trouble.
//
// Idempotent: only converts links whose `realpath` currently fails. No-op when
// run from Unix (Node skips the junction type), but kept harmless.

import {
  readdirSync,
  lstatSync,
  rmdirSync,
  unlinkSync,
  rmSync,
  symlinkSync,
  realpathSync,
  existsSync,
} from "node:fs";
import { join, resolve } from "node:path";

const tryResolve = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return null;
  }
};

const deleteLink = (p) => {
  // pnpm-in-Docker symlinks behave like directory junctions on Windows: `unlink`
  // throws EPERM, but `rmdir` removes the link without following it. Try the
  // safest options first.
  for (const fn of [
    () => rmdirSync(p),
    () => unlinkSync(p),
    () => rmSync(p, { recursive: true, force: true }),
  ]) {
    try {
      fn();
      return true;
    } catch {}
  }
  return false;
};

const scopeDirs = [];
const walk = (dir, depth = 0) => {
  if (depth > 4) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const p = join(dir, e.name);
    if (e.name === "@reactive-resume") scopeDirs.push(p);
    else if (e.name === "node_modules" || depth < 3) walk(p, depth + 1);
  }
};

for (const root of ["node_modules", "packages", "apps", "tooling"]) {
  if (existsSync(root)) walk(root);
}

let fixed = 0;
let alreadyOk = 0;
let noTarget = 0;
let errs = 0;
for (const scopeDir of scopeDirs) {
  let names;
  try {
    names = readdirSync(scopeDir);
  } catch {
    continue;
  }
  for (const name of names) {
    const linkPath = join(scopeDir, name);
    if (tryResolve(linkPath)) {
      alreadyOk++;
      continue;
    }
    const target = resolve("packages", name);
    if (!existsSync(target)) {
      noTarget++;
      continue;
    }
    if (!deleteLink(linkPath)) {
      errs++;
      console.error(`rm failed: ${linkPath}`);
      continue;
    }
    try {
      symlinkSync(target, linkPath, "junction");
      fixed++;
    } catch (e) {
      errs++;
      console.error(`junction failed: ${linkPath} (${e.code})`);
    }
  }
}

console.log(
  `fix-windows-junctions: fixed=${fixed} alreadyOk=${alreadyOk} noTarget=${noTarget} errs=${errs}`,
);
process.exit(errs > 0 ? 1 : 0);
