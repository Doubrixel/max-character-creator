FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci

COPY frontend/ frontend/
COPY backend/ backend/
RUN npm run build --workspace=frontend

FROM node:20-alpine AS runner
WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci --workspace=backend --include-workspace-root

COPY --from=builder /app/frontend/dist frontend/dist
COPY --from=builder /app/backend/src backend/src
COPY --from=builder /app/backend/drizzle backend/drizzle

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:///app/data/sqlite.db

EXPOSE 3000

CMD ["npx", "tsx", "backend/src/server.ts"]
