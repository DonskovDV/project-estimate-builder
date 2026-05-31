FROM node:20-alpine AS base
WORKDIR /app

# Build frontend
FROM base AS frontend-builder
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Build backend
FROM base AS backend-builder
COPY backend/package*.json ./backend/
RUN cd backend && npm ci
COPY backend/ ./backend/
RUN cd backend && npx prisma generate && npm run build && npx tsc -p tsconfig.seed.json

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

RUN mkdir -p /app/data

COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/prisma ./prisma
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD sh -c "npx prisma migrate deploy && node dist/prisma/seed.js && node dist/index.js"
