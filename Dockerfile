# 前端 Next.js 生产镜像
FROM node:20-alpine AS base

WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

# ---- Build ----
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Production ----
FROM base AS runner
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
