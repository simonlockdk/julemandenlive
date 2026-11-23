# Nordpolens Kontrolcentral – container-image
# Byg:  podman build -t localhost/nordpolen:latest .

# ---------- byg ----------
FROM docker.io/library/node:22-bookworm-slim AS build
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false
COPY package.json package-lock.json ./
RUN npm ci --no-audit
COPY tsconfig.json vite.config.ts ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---------- kør ----------
FROM docker.io/library/node:22-bookworm-slim
LABEL org.opencontainers.image.title="Nordpolens Kontrolcentral"
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3200 \
    DATA_DIR=/data \
    MEDIA_DIR=/media \
    WEB_DIR=/app/dist/web
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3200/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server/index.js"]
