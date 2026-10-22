# Container publishing

The repository is `reactive-resume/reactive-resume`. Docker Hub remains
`docker.io/amruthpillai/reactive-resume`; GHCR follows the repository as
`ghcr.io/reactive-resume/reactive-resume`. Do not derive Docker Hub's image name from `github.repository`.

## Builds and release safety

`.github/workflows/docker-build.yml` builds AMD64 and ARM64 on matching native runners.
All workflows run on GitHub-hosted runners (`ubuntu-latest`, `ubuntu-24.04-arm`) by default,
so forks work without setup. Setting the repository variable `USE_BLACKSMITH=true` switches
every job to Blacksmith runners (32 vCPU for build/test jobs, 2 vCPU for lightweight jobs) and
swaps in `useblacksmith/checkout`, `useblacksmith/setup-docker-builder`, and
`useblacksmith/build-push-action`. Because `uses:` cannot be an expression, each swapped
action is a pair of steps gated on the variable; keep both halves in sync when editing.

On GitHub-hosted runners, Docker Buildx shares its local cache between steps within a job and
no cache is persisted between workflow runs. On Blacksmith, the builder persists layers and the
Dockerfile's pnpm cache mounts between runs, keyed per architecture (`Dockerfile-amd64`,
`Dockerfile-arm64`).

| Trigger                                         | Action                     | Published aliases                                      | Production deployment                              |
| ----------------------------------------------- | -------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| Push to `main`                                  | Build AMD64 and ARM64      | `sha-<full-commit>`, `nightly`, timestamped nightly    | No                                                 |
| Manual dispatch, default `release=false`        | Build AMD64 and ARM64      | `sha-<full-commit>`, `canary-<run-id>-<attempt>`       | No                                                 |
| Push of a stable `v*` tag                       | Promote existing SHA image | `latest`, version/major/minor (`v6.0.0`, `v6.0`, `v6`) | When configured: SSH redeploy and Cloudflare purge |
| Push of a prerelease `v*` tag                   | Promote existing SHA image | Prerelease version only (for example, `v6.0.0-rc.1`)   | No                                                 |
| Manual dispatch, `release=true`, branch         | Promote existing SHA image | `latest`                                               | When configured: SSH redeploy and Cloudflare purge |
| Manual dispatch, `release=true`, stable tag     | Promote existing SHA image | `latest`, version/major/minor (`v6.0.0`, `v6.0`, `v6`) | When configured: SSH redeploy and Cloudflare purge |
| Manual dispatch, `release=true`, prerelease tag | Promote existing SHA image | Prerelease version only                                | No                                                 |

Each main push builds its own full commit-SHA image; newer pushes do not cancel earlier
builds. An older build still publishes its SHA and timestamped nightly aliases, but only
the current main HEAD updates the moving `nightly` alias. Architecture-specific build
outputs use `sha-<full-commit>-amd64` and `sha-<full-commit>-arm64`.

### Nightly Android APKs and GitHub releases

Every push to `main` also builds signed Android APKs for `arm64-v8a`, `armeabi-v7a`,
and `x86_64`, the three ABIs supported by the pinned Forme native binaries. There is
no daily schedule: "nightly" means each main push, matching the Docker publishing mode.
Manual canaries and stable promotions do not build these APKs or create nightly releases.

The `mobile-apk` matrix uses Expo Prebuild, Gradle, and the existing Fastlane Android
build lane on CI runners with Node 24, pnpm, Ruby, Java 17, Android SDK, and the pinned
Forme NDK. Each build selects one ABI, loads the preview EAS environment, and embeds
the preview update channel through `MOBILE_UPDATE_CHANNEL`. Signing uses the existing
Android upload keystore from Actions secrets, matching the manual native release
workflow. Nightlies use version code 1 without allocating store build numbers. Each
APK's signature, ABI, and embedded Forme library are checked before upload. Workflow
artifacts are retained for 14 days.

After all three APK builds and Docker publishing succeed, `nightly-release` creates
`nightly-<workflow-run-id>` at that push's full SHA. Each push gets its own prerelease,
including builds superseded by a newer main push. Prereleases never replace the latest
stable release or trigger production promotion. Each release contains all three APKs,
`SHA256SUMS`, and `CHANGELOG.md`; release assets outlive workflow artifact retention.
The changelog includes full commit messages from `before..after`, deduplicated merged
main PR titles/descriptions, comparison/build links, and the matching SHA Docker image.
It reads local Git history rather than the push payload's potentially truncated commit
list. A newly created main branch includes only its head commit. Very long changelogs
are attached in full, with a shortened release description linking to the attachment.

Required setup: retain `EXPO_TOKEN` and the four `ANDROID_KEYSTORE_*`/`ANDROID_KEY_*`
Actions secrets described in [mobile CI](./mobile-ci.md). The release job uses
`GITHUB_TOKEN` with `contents: write` and `pull-requests: read`;
repository rules must allow the `nightly-*` tags. No signing keys are stored in GitHub
artifacts or releases. Missing credentials fail APK publishing without undoing Docker
publishing. A failed upload leaves a draft release; rerunning the same workflow replaces
only that draft's assets and publishes it once complete. Already published releases are
left unchanged on reruns, supporting immutable releases.

These APKs use package `me.rxresu` and the preview update channel. The Android upload
certificate can differ from Play App Signing, preventing upgrades between Play and
GitHub installations. Back up local drafts before switching distributions. Add the
upload signing certificate's SHA-256 fingerprint to `MOBILE_ANDROID_CERT_SHA256` on
the backend when enabling verified App Links for sideloaded builds; retain the Play
fingerprint. Keep the same upload key across nightly builds so sideloaded installs remain
upgradable. See [mobile release handoff](./mobile-release-handoff.md#nightly-android-downloads).

References: [Expo local production builds](https://docs.expo.dev/guides/local-app-production/) and
[GitHub release API](https://docs.github.com/en/rest/releases/releases#create-a-release).

### Stable promotions

Release tags must be `vMAJOR.MINOR.PATCH`, optionally with a prerelease suffix, and match
`package.json` at the tagged commit. Promotion resolves that commit's GHCR
`sha-<full-commit>` image, validates both architectures, and copies the complete image index
within GHCR. It adds no annotations and checks that each resulting alias has the source digest.
Embedded SBOM/provenance manifests and existing digest-addressed signatures stay intact; the
workflow also signs the promoted digest.

If the main build is still running, promotion waits up to 35 minutes for the source images.
Missing images or incomplete indexes fail before aliases move; promotion never falls back to
a rebuild. For an unpublished commit on a ref containing this workflow version, run a
manual `release=false` build at that ref first, then rerun promotion. Historical refs with
older workflow files still run their original workflow; their short SHA tags are not promotion
sources. Keep full SHA images in registry retention policies so commits remain promotable.

Manual `release=true` on main or another branch updates `latest` only, keeping semver
aliases tied to Git releases. To update `latest` to main without rebuilding:

```bash
gh workflow run docker-build.yml --repo reactive-resume/reactive-resume --ref main -f release=true
```

To re-promote an existing stable release, select its Git tag. This updates `latest` and
that release's full/minor/major semver aliases. The tag must match the built `package.json`
version. Prerelease tags update only their prerelease alias and skip production integrations.

```bash
gh workflow run docker-build.yml --repo reactive-resume/reactive-resume --ref v6.0.1 -f release=true
```

SSH redeployment requires `SSH_KEY`, `SSH_HOST`, and `SSH_USER`; Cloudflare purging requires
`CLOUDFLARE_ZONE_ID` and `CLOUDFLARE_API_TOKEN`. Each integration is skipped if any required
secret is missing. Dispatch does not create a Git tag, GitHub release, or version bump.

## Native mobile updates

After successful GHCR publishing, `mobile-update` checks out the same full commit and
publishes an EAS Update using the `EXPO_TOKEN` Actions secret. The token must have access
to Expo account `reactive-resume` and project `5830280e-e1ba-45b7-b9c9-ba048fa3bd4d`.
Missing credentials fail the mobile job without undoing the published Docker image.

- Current-main nightlies, manual canaries, and prereleases publish to the `preview` channel
  using the `preview` EAS environment. Superseded main builds skip mobile publishing.
- Stable promotions publish to `production` using the `production` EAS environment only
  when the SSH redeploy step succeeded. Before publishing, three consecutive probes of
  `https://rxresu.me/api/health` must identify this service, report healthy, and match the
  full source commit. Official Docker builds embed `APP_REVISION` for that check.
- Each channel cancels superseded mobile jobs independently; Docker image builds remain
  unaffected. Publishing and deployment are separate operations, so a failed mobile job
  can leave the backend ahead. Fix the failure and rerun the release workflow.

The app uses `expo-updates` with fingerprint runtime compatibility. Generated native
projects and local Forme build output are excluded; the Rust sources and reviewed
prebuilt pin are included. Native changes need a new compatible store build; publishing
an OTA update alone cannot upgrade native code. JavaScript and asset changes are checked
at launch, downloaded in the background, and applied on the next restart.

Before first use, add `EXPO_TOKEN`, create preview/production EAS channels, and distribute
new builds with these channels and update configuration. Existing binaries without
`expo-updates` cannot receive OTA updates. See [mobile release handoff](./mobile-release-handoff.md#over-the-air-updates)
for setup, rollback, and remaining verification. Keep APIs compatible with older clients
and self-hosted servers; runtime fingerprints only protect the JavaScript/native boundary.

Manual canaries build, publish, merge, and sign images in enabled registries without
running production integrations:

```bash
gh workflow run docker-build.yml --repo reactive-resume/reactive-resume --ref main -f release=false
```

Published images retain SBOMs, maximum provenance, and Cosign signatures. GHCR always uses
the destination repository's `GITHUB_TOKEN` with `packages: write`. GHCR is the primary
registry: builds, indexes, promotion, signing, anonymous-pull verification, and production
deployment depend on it alone. Docker Hub is a best-effort mirror, enabled only when both
`DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets are present. After GHCR is published and
verified, the workflow copies the GHCR index to Docker Hub under the same tags (same digest)
and signs it there; Docker Hub login or mirror failures show as failed steps but never fail
the run. Rerun the workflow to retry a missed mirror. Image references are normalized to
lowercase. New GHCR packages need public visibility, repository linkage,
and Actions access before consumers can pull anonymously.

## Verification and historical images

The September 12, 2026 rename rebuild used commit `f89acb436865cf536fffed2b23d4d72a7ecff0db`
in [workflow run 34685606073](https://github.com/reactive-resume/reactive-resume/actions/runs/34685606073).
Both registries' `latest`, `v5`, `v5.3`, and `v5.3.0` aliases were verified at:

```text
sha256:7c7b7824785d1386fa6e0e6132c1abe43e3c281f90dbf3b1474b60bffb64d89e
```

The workflow built both architectures, generated SBOMs and provenance, signed the images,
passed anonymous AMD64/ARM64 pulls from both registries, redeployed production, and purged
Cloudflare. The live health endpoint reported healthy version `5.3.0`, and the homepage
served the new repository URL. No new GitHub release or version bump was made.

Check the manifest for `linux/amd64` and `linux/arm64`, then pull both using an empty
Docker configuration with explicit empty registry credentials to prove anonymous access
(a completely empty directory can still discover a system credential helper):

```bash
docker buildx imagetools inspect ghcr.io/reactive-resume/reactive-resume:v5.3.0
registry_config=$(mktemp -d)
printf '%s\n' '{"auths":{"ghcr.io":{}}}' > "$registry_config/config.json"
docker --config "$registry_config" pull --platform linux/amd64 ghcr.io/reactive-resume/reactive-resume:v5.3.0
docker --config "$registry_config" pull --platform linux/arm64 ghcr.io/reactive-resume/reactive-resume:v5.3.0
rm -r "$registry_config"
```

On September 11, 2026, `latest`, `v5`, `v5.3`, and `v5.3.0` were copied to the then-current
public GHCR package, `ghcr.io/reactive-resume/app`. Both architectures were pulled anonymously; the original Cosign signature,
SBOMs, provenance, and image digest were verified. The signed canary
[`canary-34582818410-1`](https://github.com/reactive-resume/reactive-resume/actions/runs/34582818410)
also passed on both registries without deploying production.

The original v5.3.0 at the previous GHCR address has digest
`sha256:c487ec5edcfe054bcb312fcd498f868e56f274756d0046b01c83f210855017ab`.
Copy complete image indexes rather than rebuilding historical releases or using a
single-platform pull/tag/push. Preserve embedded attestation manifests and copy attached
signatures separately. Verify the resulting digest before moving aliases. Retain the old
GHCR packages for historical pulls; future updates publish under the new namespace.
The repository rename does not rename registry packages. Rebuilt images use the new
repository source label and signing identity; historical digests and signatures do not change.
Release aliases are mutable: pin the original digest above if you need the pre-rename artifact.

New signatures identify
`https://github.com/reactive-resume/reactive-resume/.github/workflows/docker-build.yml@<ref>`.
Historical signatures and image source labels retain the old repository identity. Verify
historical v5.3.0 with its original workflow identity, even at its new registry address:

```bash
cosign verify \
  --certificate-identity https://github.com/amruthpillai/reactive-resume/.github/workflows/docker-build.yml@refs/heads/main \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  ghcr.io/reactive-resume/app@sha256:c487ec5edcfe054bcb312fcd498f868e56f274756d0046b01c83f210855017ab
```

After the rename, GitHub reports `use_immutable_subject: true` and subject prefix
`repo:reactive-resume@245328954/reactive-resume@249995750`. Inspect actual claims when updating external
OIDC trust policies; the repository URL alone does not describe the subject.

## Independent migration items

- GitHub Sponsors stays `AmruthPillai`; Open Collective stays `reactive-resume`.
- `server.json` keeps MCP registry identifier `io.github.amruthpillai/reactive-resume`.
  Changing that identifier creates a separate registry identity and requires its own migration.
- The old GitHub repository redirects to the new repository. Never recreate the old repository.
- The old Pages address `https://amruthpillai.github.io/reactive-resume/` returned 404 on
  September 11, 2026. GitHub now reports `https://reactive-resume.github.io/reactive-resume/`; repository
  redirects do not redirect Pages traffic. No active repository references use the old Pages URL.
- Confirm documentation hosting, Crowdin, Docker Hub source metadata, sponsorship access
  rewards, and any external OIDC policies in their owning accounts. Repository transfer alone
  does not verify those integrations.

Track availability and supported copied tags in [migration issue #3503](https://github.com/reactive-resume/reactive-resume/issues/3503).
No database reset, volume deletion, or resume-data migration is required.

References: [GitHub package permissions](https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages),
[Cosign verification](https://docs.sigstore.dev/cosign/verifying/verify/).
