# Container publishing

The repository is `reactive-resume/app`. Docker Hub remains
`docker.io/amruthpillai/reactive-resume`; GHCR follows the repository as
`ghcr.io/reactive-resume/app`. Do not derive Docker Hub's image name from `github.repository`.

## Builds and release safety

`.github/workflows/docker-build.yml` builds AMD64 and ARM64 on matching native Blacksmith
32-vCPU runners. Blacksmith's persistent Docker builder caches layers and cache mounts;
the architecture-specific cache keys keep the two builders separate.

| Trigger | Published aliases | Production deployment |
| --- | --- | --- |
| Push to `main` | `sha-*`, `nightly`, timestamped nightly | No |
| Manual dispatch, default `release=false` | `sha-*`, `canary-<run-id>-<attempt>` | No |
| Push of a `v*` tag or explicit `release=true` | `sha-*`, `latest`, version/major/minor | Yes: SSH redeploy and Cloudflare purge |

Manual canaries first run a cache-only build on each architecture, then publish, merge,
and sign both registry images. Run one with:

```bash
gh workflow run docker-build.yml --repo reactive-resume/app --ref main -f release=false
```

Both registries retain SBOMs, maximum provenance, and Cosign signatures. Publishing uses
`DOCKER_USERNAME` / `DOCKER_PASSWORD` for Docker Hub and the destination repository's
`GITHUB_TOKEN` with `packages: write` for GHCR. New GHCR packages need public visibility,
repository linkage, and Actions access before consumers can pull anonymously.

## Verification and historical images

Check the manifest for `linux/amd64` and `linux/arm64`, then pull both using an empty
Docker configuration with explicit empty registry credentials to prove anonymous access
(a completely empty directory can still discover a system credential helper):

```bash
docker buildx imagetools inspect ghcr.io/reactive-resume/app:v5.3.0
registry_config=$(mktemp -d)
printf '%s\n' '{"auths":{"ghcr.io":{}}}' > "$registry_config/config.json"
docker --config "$registry_config" pull --platform linux/amd64 ghcr.io/reactive-resume/app:v5.3.0
docker --config "$registry_config" pull --platform linux/arm64 ghcr.io/reactive-resume/app:v5.3.0
rm -r "$registry_config"
```

On September 11, 2026, `latest`, `v5`, `v5.3`, and `v5.3.0` were copied to the new public
GHCR package. Both architectures were pulled anonymously; the original Cosign signature,
SBOMs, provenance, and image digest were verified. The signed Blacksmith canary
[`canary-34582818410-1`](https://github.com/reactive-resume/app/actions/runs/34582818410)
also passed on both registries without deploying production.

Historical v5.3.0 has digest
`sha256:c487ec5edcfe054bcb312fcd498f868e56f274756d0046b01c83f210855017ab`.
Copy complete image indexes rather than rebuilding historical releases or using a
single-platform pull/tag/push. Preserve embedded attestation manifests and copy attached
signatures separately. Verify the resulting digest before moving aliases. Retain the old
GHCR package for historical pulls; future updates publish under the new namespace.

New signatures identify
`https://github.com/reactive-resume/app/.github/workflows/docker-build.yml@<ref>`.
Historical signatures and image source labels retain the old repository identity. Verify
historical v5.3.0 with its original workflow identity, even at its new registry address:

```bash
cosign verify \
  --certificate-identity https://github.com/amruthpillai/reactive-resume/.github/workflows/docker-build.yml@refs/heads/main \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  ghcr.io/reactive-resume/app@sha256:c487ec5edcfe054bcb312fcd498f868e56f274756d0046b01c83f210855017ab
```

On September 11, 2026, GitHub reported `use_immutable_subject: true` and subject prefix
`repo:reactive-resume@245328954/app@249995750`. Inspect actual claims when updating external
OIDC trust policies; the repository URL alone does not describe the subject.

## Independent migration items

- GitHub Sponsors stays `AmruthPillai`; Open Collective stays `reactive-resume`.
- `server.json` keeps MCP registry identifier `io.github.amruthpillai/reactive-resume`.
  Changing that identifier creates a separate registry identity and requires its own migration.
- The old GitHub repository redirects to the new repository. Never recreate the old repository.
- The old Pages address `https://amruthpillai.github.io/reactive-resume/` returned 404 on
  September 11, 2026. GitHub now reports `https://reactive-resume.github.io/app/`; repository
  redirects do not redirect Pages traffic. No active repository references use the old Pages URL.
- Confirm documentation hosting, Crowdin, Docker Hub source metadata, sponsorship access
  rewards, and any external OIDC policies in their owning accounts. Repository transfer alone
  does not verify those integrations.

Track availability and supported copied tags in [migration issue #3503](https://github.com/reactive-resume/app/issues/3503).
No database reset, volume deletion, or resume-data migration is required.

References: [Blacksmith Docker caching](https://docs.blacksmith.sh/blacksmith-caching/docker-builds),
[GitHub package permissions](https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages),
[Cosign verification](https://docs.sigstore.dev/cosign/verifying/verify/).
