FROM mcr.microsoft.com/devcontainers/typescript-node:24

RUN corepack enable

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 3000