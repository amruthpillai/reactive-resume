# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS base

WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    TURBO_TELEMETRY_DISABLED=1

RUN corepack enable

FROM base AS pruner
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm dlx turbo@2.9.9 prune web --docker

FROM base AS builder
COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ ./
RUN pnpm turbo run build --filter=web

FROM base AS runtime-pruner
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm dlx turbo@2.9.9 prune @reactive-resume/runtime-externals --docker

FROM base AS runtime-deps
COPY --from=runtime-pruner /app/out/json/ ./
COPY --from=runtime-pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm --filter=@reactive-resume/runtime-externals deploy --prod --legacy /runtime-deps

FROM node:${NODE_VERSION}-slim AS runtime

LABEL maintainer="amruthpillai"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.title="Reactive Resume"
LABEL org.opencontainers.image.description="A free and open-source resume builder."
LABEL org.opencontainers.image.vendor="Amruth Pillai"
LABEL org.opencontainers.image.url="https://rxresu.me"
LABEL org.opencontainers.image.documentation="https://docs.rxresu.me"
LABEL org.opencontainers.image.source="https://github.com/amruthpillai/reactive-resume"

ENV NODE_ENV="production" \
    PORT=3000

WORKDIR /app

RUN mkdir -p /app/apps/web /app/data && chown node:node /app/data

COPY --from=runtime-deps --chown=node:node /runtime-deps/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/apps/web/.output ./apps/web/.output
COPY --from=pruner --chown=node:node /app/migrations ./migrations

WORKDIR /app/apps/web

USER node

EXPOSE 3000/tcp
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1));"]

CMD ["node", ".output/server/index.mjs"]
