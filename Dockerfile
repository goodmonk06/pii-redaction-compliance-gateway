# Base stage with Node.js
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/dashboard/package.json ./packages/dashboard/
RUN npm ci

# Backend builder stage
FROM base AS backend-builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/backend ./packages/backend
COPY package.json ./
WORKDIR /app/packages/backend
RUN npx prisma generate
RUN npm run build

# Backend production stage
FROM base AS backend
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=backend-builder /app/packages/backend/dist ./dist
COPY --from=backend-builder /app/packages/backend/node_modules ./node_modules
COPY packages/backend/package.json ./
COPY packages/backend/prisma ./prisma
RUN npx prisma generate
EXPOSE 3001
CMD ["node", "dist/index.js"]

# Dashboard builder stage
FROM base AS dashboard-builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/dashboard ./packages/dashboard
COPY package.json ./
WORKDIR /app/packages/dashboard
RUN npm run build

# Dashboard production stage
FROM base AS dashboard
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=dashboard-builder /app/packages/dashboard/public ./public
COPY --from=dashboard-builder --chown=nextjs:nodejs /app/packages/dashboard/.next/standalone ./
COPY --from=dashboard-builder --chown=nextjs:nodejs /app/packages/dashboard/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
