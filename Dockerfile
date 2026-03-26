# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy patches if they exist
COPY patches* ./patches/

# Install all dependencies (including devDeps for build)
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY . .

# Build client (Vite)
RUN pnpm build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy patches if they exist
COPY patches* ./patches/

# Install production dependencies only
RUN pnpm install --no-frozen-lockfile --prod

# Copy built client
COPY --from=builder /app/dist ./dist

# Copy server source
COPY --from=builder /app/server ./server
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/storage ./storage

# Install tsx for server runtime
RUN pnpm add -g tsx

EXPOSE 3000

ENV NODE_ENV=production

CMD ["tsx", "server/_core/index.ts"]
