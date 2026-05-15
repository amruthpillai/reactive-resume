# Docker Nightly and Release Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Update the Docker image workflow so pushes to `main` publish amd64-only nightly tags, while manual runs and pushed version tags publish release tags with the existing multi-arch behavior.

**Architecture:** Keep the existing digest-build and manifest-merge pipeline in `.github/workflows/docker-build.yml`. Add event-based mode expressions so nightly and release publishing share setup, registry auth, digest upload/download, signing, and inspection while differing only in triggers, platform inclusion, final tags, and redeploy behavior.

**Tech Stack:** GitHub Actions, Docker Buildx, `docker/metadata-action@v6`, `docker/build-push-action@v7`, `docker buildx imagetools`, Cosign.

---

### Task 1: Add Workflow Triggers and Mode Outputs

**Files:**
- Modify: `.github/workflows/docker-build.yml`

- [x] **Step 1: Update workflow triggers**

Change the workflow `on` block to include:

```yaml
on:
  workflow_dispatch:
  push:
    branches:
      - main
    tags:
      - "v*"
```

Expected behavior:
- `push` to `main` runs the workflow.
- `push` to tags matching `v*` runs the workflow.
- PR events do not run the workflow.
- Manual runs still run the workflow.

- [x] **Step 2: Add a mode job**

Add a `mode` job before `build`:

```yaml
  mode:
    runs-on: ubuntu-latest
    outputs:
      nightly: ${{ steps.mode.outputs.nightly }}
      release: ${{ steps.mode.outputs.release }}
      matrix: ${{ steps.mode.outputs.matrix }}
    steps:
      - name: Determine publishing mode
        id: mode
        run: |
          if [[ "${{ github.event_name }}" == "push" && "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "nightly=true" >> "$GITHUB_OUTPUT"
            echo "release=false" >> "$GITHUB_OUTPUT"
            echo 'matrix={"include":[{"platform":"linux/amd64","runner":"ubuntu-latest","arch":"amd64"}]}' >> "$GITHUB_OUTPUT"
          else
            echo "nightly=false" >> "$GITHUB_OUTPUT"
            echo "release=true" >> "$GITHUB_OUTPUT"
            echo 'matrix={"include":[{"platform":"linux/amd64","runner":"ubuntu-latest","arch":"amd64"},{"platform":"linux/arm64","runner":"ubuntu-24.04-arm","arch":"arm64"}]}' >> "$GITHUB_OUTPUT"
          fi
```

This job centralizes the event decision so later jobs do not duplicate the full expression.

### Task 2: Generate the Platform Matrix from Mode

**Files:**
- Modify: `.github/workflows/docker-build.yml`

- [x] **Step 1: Make `build` depend on `mode`**

Set:

```yaml
    needs: mode
```

on the `build` job.

- [x] **Step 2: Replace the static build matrix with the mode output**

Set the build strategy matrix to the JSON emitted by the `mode` job:

```yaml
      matrix: ${{ fromJSON(needs.mode.outputs.matrix) }}
```

Expected behavior:
- Nightly runs create only the `amd64` matrix entry.
- Release/manual/tag runs create both `amd64` and `arm64` matrix entries.

### Task 3: Generate Conditional Final Tags

**Files:**
- Modify: `.github/workflows/docker-build.yml`

- [x] **Step 1: Make `merge` depend on `mode` and `build`**

Set:

```yaml
    needs:
      - mode
      - build
```

on the `merge` job.

- [x] **Step 2: Update final Docker metadata tags**

In the merge job's Docker metadata step, replace the unconditional release tag list with conditional tags:

```yaml
          tags: |
            type=sha,prefix=sha-
            type=raw,value=nightly,enable=${{ needs.mode.outputs.nightly == 'true' }}
            type=raw,value=nightly-{{date 'YYYYMMDDHHmmss' tz='UTC'}},enable=${{ needs.mode.outputs.nightly == 'true' }}
            type=raw,value=latest,enable=${{ needs.mode.outputs.release == 'true' }}
            type=raw,value=v${{ steps.version.outputs.version }},enable=${{ needs.mode.outputs.release == 'true' }}
            type=raw,value=v${{ steps.semver.outputs.major }}.${{ steps.semver.outputs.minor }},enable=${{ needs.mode.outputs.release == 'true' }}
            type=raw,value=v${{ steps.semver.outputs.major }},enable=${{ needs.mode.outputs.release == 'true' }}
```

Expected behavior:
- Nightly runs publish `nightly`, `nightly-{UTC timestamp}`, and SHA tags.
- Release/manual/tag runs publish `latest`, version aliases, and SHA tags.

### Task 4: Make Post-Publish Steps Mode-Aware

**Files:**
- Modify: `.github/workflows/docker-build.yml`

- [x] **Step 1: Emit canonical image references from the manifest step**

In `Create manifest list and push`, compute the canonical final tag from mode:

```bash
if [[ "${{ needs.mode.outputs.nightly }}" == "true" ]]; then
  FINAL_TAG="nightly"
else
  FINAL_TAG="v${{ steps.version.outputs.version }}"
fi
```

Use `$FINAL_TAG` for both GHCR and Docker Hub digest lookup.

- [x] **Step 2: Inspect the canonical final tag**

Update `Inspect image` to inspect:

```bash
docker buildx imagetools inspect ghcr.io/${{ env.IMAGE }}:${{ steps.manifest.outputs.final_tag }}
docker buildx imagetools inspect docker.io/${{ env.IMAGE }}:${{ steps.manifest.outputs.final_tag }}
```

- [x] **Step 3: Keep redeploy release-only**

Add this condition to `Redeploy Stack`:

```yaml
        if: ${{ needs.mode.outputs.release == 'true' }}
```

Expected behavior:
- Nightly publishes images, signs them, and inspects them.
- Nightly does not redeploy the stack.
- Release/manual/tag publishes images, signs them, inspects them, and redeploys.

### Task 5: Validate Workflow Logic

**Files:**
- Test: `.github/workflows/docker-build.yml`

- [x] **Step 1: Parse YAML**

Run:

```bash
ruby -e 'require "yaml"; YAML.load_file(".github/workflows/docker-build.yml"); puts "yaml ok"'
```

Expected output:

```text
yaml ok
```

- [x] **Step 2: Review the workflow diff**

Run:

```bash
git diff -- .github/workflows/docker-build.yml docs/superpowers/plans/2026-05-15-docker-nightly-release-tags.md
```

Confirm these requirements in the diff:
- `push` to `main` is enabled.
- pushed tags matching `v*` are enabled.
- no `pull_request` trigger exists.
- the matrix output contains only amd64 when `nightly == 'true'`.
- nightly tags are enabled only for nightly mode.
- release tags are enabled only for release mode.
- redeploy is release-only.

- [x] **Step 3: Check working tree scope**

Run:

```bash
git status --short .github/workflows/docker-build.yml docs/superpowers/plans/2026-05-15-docker-nightly-release-tags.md
```

Expected output includes only the workflow and this plan among files changed by this implementation.
