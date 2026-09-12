# -----------------------------------------------------------------------------
# 1. Base image with Node 20, Bun & OpenSSL
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=oven/bun:1.2 /usr/local/bin/bun /usr/local/bin/bun
COPY --from=oven/bun:1.2 /usr/local/bin/bunx /usr/local/bin/bunx

# -----------------------------------------------------------------------------
# 2. Dependencies stage
# -----------------------------------------------------------------------------
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

# -----------------------------------------------------------------------------
# 3. Builder stage
# -----------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client & Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

ARG NEXT_PUBLIC_SUPABASE_URL
ARG SUPABASE_SERVICE_ROLE_KEY
ARG USE_SUPABASE_DB=true

ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
ENV USE_SUPABASE_DB=${USE_SUPABASE_DB}

RUN node node_modules/.bin/prisma generate
RUN bun run build

# -----------------------------------------------------------------------------
# 4. Runner stage (Production)
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV USE_SUPABASE_DB=true
# Limit Node.js heap to 1GB — prevents the container from consuming all VPS RAM
# when in-memory caches grow. The app normally uses ~500MB; this leaves headroom.
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Copy built standalone application & public static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]

