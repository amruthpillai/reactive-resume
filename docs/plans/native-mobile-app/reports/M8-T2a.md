# M8-T2a: deliver verified Forme native prebuilts

Status: succeeded within the requested local-only scope. Branch: `mobile/M8-T2a`, base `21a222555`. Implementation commit: `5b8cb03be` (`feat(mobile): add verified forme native prebuilts and notices`). No push, workflow dispatch, upload or release creation.

## Delivered and strategy

Selected strategy (a): build both platforms on macOS CI, fetch verified prebuilts on EAS. Local developers keep `bash packages/forme-native/rust/build.sh` unchanged.

- `.github/workflows/mobile-forme-native.yml`: manual dispatch, pinned Rust toolchain/cbindgen/cargo-ndk/NDK, two iOS slices and three Android ABIs, notice/header drift checks, archive/checksum manifest generation, and local fetch verification for both platforms without Cargo on PATH. Saves a workflow artifact named by package version and Rust source hash, retained for 30 days. An explicit `publish` input, default false, can create a prerelease with archive and manifest; it never overwrites existing assets. This workflow was written and linted, not run remotely.
- `packages/forme-native/scripts/artifact.mjs`: shared content identity, required-library validation and tar packaging. Hashes sorted relative paths and SHA-256 contents of every `rust/` file except generated `rust/target/`, including lockfile and toolchain/build-tool pins. Uses package version separately. Archive checksum is independent of source identity; reproducible archive bytes are not assumed.
- `scripts/fetch-prebuilt.mjs`: no npm dependencies, Cargo or Rust installation. Native EAS platform guard, reviewed local manifest, exact version/source match and pinned SHA-256 before extraction. HTTPS required for production; explicit local `--manifest` permits file URLs for dry runs. Rejects unexpected/traversal paths, non-regular entries including symlinks/hardlinks, and missing/empty required files. Validates before replacing generated files; failed fetch/validation preserves existing files and removes staging. Installs both platforms plus header, since Android's JNI compilation needs that header too.
- `scripts/prebuilt.json`: schema version 1, initially empty artifact list. No fake production checksum or unpublished local file URL was committed. First published CI artifact must be reviewed and pinned before EAS builds can use it.
- `scripts/notices.mjs` and `THIRD_PARTY_NOTICES.md`: Cargo metadata-based generation covering all 102 third-party resolved crates, including build and target-specific dependencies, SPDX expressions and bundled licence/notice texts. Includes HarfBuzz 8.4.0 Old-MIT and Microsoft USE notice. `cms 0.2.3` omits separate licence files from its published crate; its README licence declaration is preserved. Line endings/trailing whitespace are normalized without changing licence wording. Regeneration is deterministic and passes Oxfmt without a post-generation formatter.
- Package README documents build/publish/review/pin/fetch flow, integration hook, local reproduction and notices. Package-local `.gitignore` also ignores temporary extraction directories; libraries remain ignored.

Trade-offs: EAS avoids Rust toolchain installation, macOS-only build script problems on Linux, and repeated native compilation. CI still needs macOS for xcframework creation. Combining platform outputs simplifies pinning and verification but downloads more than a platform-specific archive. A reviewed checksum update after each changed source/version is deliberate; silently accepting a downloaded checksum would defeat pinning. Workflow artifacts expire, so production uses persistent release assets after publication is authorized.

## M8-T2 integration contract

The coordinator/M8-T2 adds this to `apps/mobile/package.json`, alongside EAS profile work:

```json
{
	"scripts": {
		"eas-build-pre-install": "node ../../packages/forme-native/scripts/fetch-prebuilt.mjs"
	}
}
```

Use **pre-install**, not post-install. Current Expo documentation says post-install follows Expo prebuild on Android and follows prebuild plus pod install on iOS. Pre-install works without node_modules because scripts use only Node built-ins and system `tar`. Script-relative paths work from the mobile app's directory. `EAS_BUILD_PLATFORM=ios|android` activates the fetch; ordinary web/server installs have no hook and direct invocation without a native marker exits before even reading a manifest.

Documentation verified with Context7: `npx ctx7@latest library Expo "EAS Build lifecycle hooks run before prebuild after dependencies installed monorepo working directory"`, then `npx ctx7@latest docs /websites/expo_dev "EAS Build eas-build-post-install lifecycle hook before prebuild Android iOS EAS_BUILD_PLATFORM"`. Source: <https://docs.expo.dev/build-reference/npm-hooks>.

Before the first EAS build, publish the intended workflow archive when authorized and commit its generated `prebuilt.json` to the package's scripts directory after reviewing the URL, version, Rust hash and exact archive checksum together. Manifest schema:

```json
{
	"schemaVersion": 1,
	"artifacts": [
		{
			"version": "<package version>",
			"sourceHash": "<64 lowercase hex characters>",
			"tag": "forme-native-v<version>-<sourceHash>",
			"url": "https://github.com/reactive-resume/reactive-resume/releases/download/<tag>/<tag>.tar.gz",
			"sha256": "<reviewed exact archive SHA-256>"
		}
	]
}
```

Do not fetch the checksum manifest during EAS builds or reuse a local archive checksum for a different CI archive. Retain this package's Rust inputs, scripts and manifest in any future custom `.easignore`. M8-T2 also consumes `THIRD_PARTY_NOTICES.md` in its licences screen. No package manifest/export entry was added; M1-T1 owns `packages/forme-native/package.json` and the app scaffold.

## Validation

`node_modules` already existed; no dependency install or manifest/lockfile changes were needed. Shell commands used `rtk proxy` so pnpm filter arguments were preserved.

| Command/check | Result |
| --- | --- |
| `bash packages/forme-native/rust/build.sh` | Pass: Rust 1.95.0, cbindgen 0.29.4, cargo-ndk 4.1.2, NDK 28.2.13676358; arm64 iOS device/simulator and Android arm64-v8a/armeabi-v7a/x86_64 |
| `pnpm --filter @reactive-resume/forme-native typecheck` | Pass |
| `pnpm --filter mobile typecheck` | No matching project on this disjoint branch; not counted as validation |
| `pnpm exec oxlint --fix packages/forme-native/scripts`, then scoped `oxfmt` | Applied |
| `pnpm exec oxlint --deny-warnings packages/forme-native` | Pass |
| `pnpm exec oxfmt --check packages/forme-native .github/workflows/mobile-forme-native.yml` | Pass |
| `pnpm exec turbo boundaries` | Pass: 1,179 files, 22 packages |
| `actionlint .github/workflows/mobile-forme-native.yml` | Pass |
| `pnpm lint:agent` | Pass |
| `pnpm format:check` | Fails solely on pre-existing, untracked `paseo.json`; left untouched |
| `node packages/forme-native/scripts/notices.mjs` twice plus independent output hash comparison | Pass: deterministic, all resolved third-party crates and HarfBuzz notices present |
| Temporary `node /tmp/m8-t2a-check.mjs` CLI assertion harness | Pass; details below |
| `git diff --check`, ownership/staging review | Pass; no binary or unrelated file staged |

Test-audit gate: the observable boundary is installation of the exact approved native bytes. Credible regressions are checksum bypass, stale-source installs, native libraries missing from the archive, unsafe extraction, and accidental fetch on a non-native install. Existing renderer tests cannot exercise this distribution boundary. Temporary assertions invoked real CLIs and system tar, used independently computed SHA-256 values and snapshots of all generated files, and added no production test seam or committed unit suite.

### Local artifact evidence

The actual newly built libraries, not dummy fixtures, were packaged and then removed from generated destinations before each fresh fetch. Both native platforms restored all 12 output files byte-for-byte with `PATH=/usr/bin:/bin` (Cargo excluded), invoking Node by its absolute path from outside the checkout. No HTTP server or background process was needed.

- Package version: `0.0.0` (current manifest, unchanged).
- Rust source hash: `e96ba4390f3656b93ceaa155f3a29d3eccb9a065bb5642ac92925fe4aa903abf`.
- Archive bytes: **25,452,157**; contains both iOS slices and all Android ABIs. This is a build-input download, not a store app-size measurement.
- Local archive SHA-256: `f3df42b0ebc7cb82c1c2ad63b5a946ed705de986fddf8dadd0a968ae076dc908`. Not a production pin.
- Temporary archive/manifest directory: `/var/folders/3n/ghfrlwh90rx96d18_md37n080000gn/T/forme-native-m8-t2a-LJhOKW/`; OS may remove it later.

Assertions also proved:

- No native marker or a web marker skips even an explicitly nonexistent manifest.
- Missing default pin, stale source hash, changed package version, duplicate pin and missing checksum fail with the local build command.
- Wrong checksum and corrupted archive fail before installation.
- A correctly checksummed but incomplete archive fails validation before installation.
- Correctly checksummed unexpected-path and symlink archives fail before extraction/installation.
- Every rejected fetch retains all previously installed file hashes and cleans temporary staging.

Minimal reproduction with maintained scripts:

```sh
bash packages/forme-native/rust/build.sh
node packages/forme-native/scripts/artifact.mjs pack /tmp/forme-native-prebuilt
node packages/forme-native/scripts/fetch-prebuilt.mjs --platform android --manifest /tmp/forme-native-prebuilt/prebuilt.json
node packages/forme-native/scripts/fetch-prebuilt.mjs --platform ios --manifest /tmp/forme-native-prebuilt/prebuilt.json
```

## Limits and handoff

- No live GitHub Actions/EAS build, release, upload, push, native app build, simulator run or store-size measurement was performed. Workflow and fetch were authored and verified locally only, as requested. Hosted runner/tool installation and HTTPS release download remain unproven until an authorized remote run.
- EAS intentionally fails until publication and reviewed pinning, then M8-T2's pre-install hook wiring. No question or owner input blocks this local-only deliverable.
- Ordinary local native builds are unchanged. Binaries remain ignored; generated header has no diff. No `apps/mobile`, package manifest, root manifest, lockfile, ledger or unrelated source changes.
- `paseo.json` remains the original untracked file. All build/check/commit processes were collected before handoff; no background task remains.

## Review fixes: blocker and notes 1–2

- Workflow-level permission is now `contents: read`. The macOS `prebuilt` job inherits it, including dependency build scripts and setup actions. A separate Ubuntu `publish` job has `needs: prebuilt`, `if: inputs.publish` and job-level `contents: write`; its only steps download the uploaded artifact and invoke `gh release create`. It does not check out source, set up Node/Rust/Android or execute build code. Only the artifact tag crosses the job-output boundary; archive/manifest paths are reconstructed in the fresh publish runner's artifact directory.
- `android-actions/setup-android` is pinned to `9fc6c4e9069bf8d3d10b2204b1fb8f6ef7065407`, with `# v3.2.2`. Verified using upstream `git ls-remote`: both `refs/tags/v3` and `refs/tags/v3.2.2` resolve to this commit.
- Replaced implicit `rustup show active-toolchain` installation with explicit `rustup toolchain install 1.95.0 --profile minimal --target aarch64-apple-ios,aarch64-apple-ios-sim,aarch64-linux-android,armv7-linux-androideabi,x86_64-linux-android`. Temporary assertions compare the version, profile and all five targets against `rust/rust-toolchain.toml`.

Revalidation: `actionlint .github/workflows/mobile-forme-native.yml`, scoped Oxfmt, `pnpm lint:agent` and `git diff --check` pass. The existing `/tmp/m8-t2a-check.mjs` dry-run harness passes again with real binaries: both native installs without Cargo, all 12 files preserved byte-for-byte, checksum/source/version rejection, incomplete/unexpected/symlink archive rejection, failure cleanup and deterministic notices.

A temporary Ruby/YAML check rejects the pre-fix workflow specifically for its writable build token and accepts the corrected permission/job boundaries. It also verifies the action SHA and explicit toolchain targets, packages a real archive with its release URL, and executes the exact publish shell against a local `gh` stub to assert archive/manifest arguments without creating a release. Test-audit gate: these assertions protect the public workflow permission and artifact handoff contracts; renderer checks cannot detect token privilege escalation. No production test seam or committed unit suite was added.

No remote workflow, toolchain installation, upload, release or push was performed during the fix round. Native source/binaries and app/package manifests were unchanged; only workflow and this report changed.
