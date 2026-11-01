# ── Stage 1: build TypeScript ──────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN npm ci --omit=dev

# ── Stage 2: runtime ────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# @sparticuz/chromium inclui o próprio Chromium; só precisa dessas libs
RUN apk add --no-cache \
    ca-certificates \
    libstdc++ \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

USER appuser

EXPOSE 3000

CMD ["node", "dist/server.js"]
