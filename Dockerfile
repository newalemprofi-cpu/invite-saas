FROM node:22-bookworm-slim AS base

# --- deps stage ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- builder stage ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build
# Compiled maintenance worker (dist-worker/) — same image, different
# entrypoint at runtime (see the runner CMD note below / Coolify docs).
RUN npm run build:worker

# --- runner stage ---
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# OpenSSL is required by the Prisma query engine at runtime
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid 1001 nextjs

# Full node_modules first, as the base layer — the compiled worker
# (dist-worker/, plain tsc output, not traced/bundled by Next) needs
# bullmq/ioredis/@aws-sdk at runtime that Next's standalone tracer has no
# reason to know about. The standalone copy below layers its own pruned
# node_modules subset on top for the web server; same package versions,
# so this is a safe merge, not a conflicting duplicate.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Next.js standalone app
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Compiled maintenance worker — see package.json's build:worker/start:worker
COPY --from=builder --chown=nextjs:nodejs /app/dist-worker ./dist-worker

# Prisma schema (needed by CLI commands at runtime)
COPY --from=builder /app/prisma ./prisma

# package.json is required for npm run db:push / db:migrate
COPY --from=builder /app/package.json ./package.json

# Prisma CLI + client packages (not included in Next.js standalone tracing)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Create a real symlink so __dirname resolves to node_modules/prisma/build/
# (Docker COPY dereferences symlinks, causing WASM lookups to fail in .bin/)
RUN mkdir -p ./node_modules/.bin && \
    ln -sf ../prisma/build/index.js ./node_modules/.bin/prisma && \
    chmod +x ./node_modules/prisma/build/index.js

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Default CMD is the WEB role (runs pending migrations, then serves).
# The WORKER role uses the exact same image with a different Coolify Start
# Command (see README's Coolify section): node dist-worker/worker.js
# — it must NEVER run `prisma migrate deploy`.
CMD ["sh", "-c", "node ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma && node server.js"]
# --- worker stage ---
# Coolify worker application uses:
# Docker Build Stage Target = worker

FROM runner AS worker

CMD ["node", "dist-worker/worker.js"]


# --- default web stage ---
# Keep this stage LAST so normal Docker builds continue to run the web app.

FROM runner AS web