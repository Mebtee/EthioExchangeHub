# syntax=docker/dockerfile:1

# ---- Stage 1: install ALL dependencies (dev + prod) ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Stage 2: build TypeScript ----
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Stage 3: production runtime (deps + compiled output only) ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Production dependencies only — no dev tooling in the final image.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled output only. No source, no tests, no node_modules dev deps.
COPY --from=build /app/dist ./dist

USER node
EXPOSE 5000
CMD ["node", "dist/index.js"]
