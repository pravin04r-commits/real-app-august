# ── R.E.A.L. API — Render deployment ───────────────────────────
# Built from the monorepo root:
#   docker build -f apps/api/Dockerfile .
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api/package.json ./apps/api/

RUN npm install --workspaces --include-workspace-root --ignore-scripts

COPY packages ./packages
COPY apps/api ./apps/api

RUN npm run build --workspace=@real/api

# ── runtime ────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S real && adduser -S real -G real

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json

# Everything app-level is bundled by tsup; only runtime deps remain.
RUN npm install --omit=dev --no-package-lock --ignore-scripts \
 && npm cache clean --force

USER real
EXPOSE 4000
CMD ["node", "dist/index.js"]
