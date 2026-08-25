# -----------------------------------------------------------------------------
# 1. Base image with Bun & OpenSSL
# -----------------------------------------------------------------------------
FROM oven/bun:1.2-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# 2. Dependencies stage
# -----------------------------------------------------------------------------
FROM base AS deps
COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile

# -----------------------------------------------------------------------------
# 3. Builder stage
# -----------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client & Build Next.js app
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN bun run db:generate
RUN bun run build

# -----------------------------------------------------------------------------
# 4. Runner stage (Production)
# -----------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Copy built standalone application & public static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["bun", "run", "server.js"]
