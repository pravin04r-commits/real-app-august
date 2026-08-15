# ── R.E.A.L. API — Render deployment ───────────────────────────
# Built from the monorepo ROOT, not from this folder:
#   docker build -f apps/api/Dockerfile .
# render.yaml already sets dockerContext: . for exactly this reason.

FROM node:20-alpine AS builder
WORKDIR /app

# Copy manifests first so Docker can cache the install layer.
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api/package.json ./apps/api/

RUN npm install --workspaces --include-workspace-root --ignore-scripts

COPY packages ./packages
COPY apps/api ./apps/api

# tsup bundles @real/types and @real/utils straight into dist/index.js
RUN npm run build --workspace=@real/api

# ── runtime ────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S real && adduser -S real -G real

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json

# @real/types and @real/utils are workspace-only packages — they do not exist
# on the npm registry, so leaving them in dependencies makes this install fail
# with a 404. They are already bundled into dist, so strip them out and install
# only the third-party runtime deps.
RUN node -e "\
const fs = require('fs'); \
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); \
for (const name of Object.keys(pkg.dependencies || {})) { \
  if (name.startsWith('@real/')) delete pkg.dependencies[name]; \
} \
delete pkg.devDependencies; \
pkg.scripts = { start: 'node dist/index.js' }; \
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2)); \
" \
 && npm install --omit=dev --no-package-lock --ignore-scripts \
 && npm cache clean --force

USER real
EXPOSE 4000

# Render probes /health; the server handles SIGTERM for clean redeploys.
CMD ["node", "dist/index.js"]
