# Learnarr: one image, one /config volume, no environment variables needed.
#
#   docker compose up -d     (see docker-compose.yml)

FROM node:24-slim AS build
WORKDIR /app
# better-sqlite3 compiles from source when no prebuilt binary fits the platform.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm rebuild better-sqlite3
COPY . .
RUN npm run build

# The lemmatiser. Its language models download on demand into /config.
FROM node:24-slim AS udpipe
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl unzip make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY scripts/fetch-udpipe.sh /fetch-udpipe.sh
RUN UDPIPE_DIR=/opt/udpipe bash /fetch-udpipe.sh

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=7979 \
    DATA_DIR=/config \
    MIGRATIONS_DIR=/app/migrations \
    UDPIPE_BIN=/opt/udpipe/udpipe \
    PUID=1000 \
    PGID=1000
COPY --from=udpipe /opt/udpipe/udpipe /opt/udpipe/udpipe
COPY --from=build /app/.output ./.output
COPY --from=build /app/server/db/migrations ./migrations
COPY docker/entrypoint.sh /entrypoint.sh
VOLUME /config
EXPOSE 7979
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 7979) + '/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
