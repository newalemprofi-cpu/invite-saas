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

# --- runner stage ---
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# OpenSSL is required by the Prisma query engine at runtime
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid 1001 nextjs

# Next.js standalone app
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

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

CMD ["node", "server.js"]
