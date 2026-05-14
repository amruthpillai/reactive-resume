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
    pnpm dlx turbo@2.9.9 prune web server --docker

FROM base AS builder
COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ ./
RUN rm -rf apps/web/dist apps/server/dist && pnpm turbo run build --filter=web --filter=server --force

FROM base AS runtime-pruner
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm dlx turbo@2.9.9 prune server @reactive-resume/runtime-externals --docker

FROM base AS runtime-deps
COPY --from=runtime-pruner /app/out/json/ ./
COPY --from=runtime-pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install --prod --frozen-lockfile

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
    PORT=3000 \
    LOCAL_STORAGE_PATH=/app/data

WORKDIR /app

RUN mkdir -p /app/apps/server /app/apps/web /app/data && chown node:node /app/data

COPY --from=runtime-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=pruner --chown=node:node /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=node:node /app/apps/web/dist ./apps/web/dist
COPY --from=builder --chown=node:node /app/apps/server/dist ./apps/server/dist
COPY --from=pruner --chown=node:node /app/migrations ./migrations

WORKDIR /app

USER node

EXPOSE 3000/tcp
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}/api/health`).then((r) => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1));"]

CMD ["node", "apps/server/dist/index.mjs"]
