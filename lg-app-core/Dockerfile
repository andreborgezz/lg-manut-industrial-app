# ── Stage 1: build TypeScript ──────────────────────────────────────────────
FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# remove devDeps depois do build
RUN npm ci --omit=dev

# ── Stage 2: runtime com Chromium ──────────────────────────────────────────
# mcr.microsoft.com/playwright traz o Chromium compatível com a versão do pacote
FROM mcr.microsoft.com/playwright:v1.64.0-noble AS runtime

# não rodar como root
RUN groupadd -r appuser && useradd -r -g appuser -m appuser

WORKDIR /app

# fontes de fallback para o Chromium (segurança)
RUN apt-get update && apt-get install -y --no-install-recommends fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

# copia dependências de produção e artefato compilado
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# o Playwright usa PLAYWRIGHT_BROWSERS_PATH para encontrar o chromium instalado na imagem base
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# usuário sem privilégios; Chromium roda com --no-sandbox quando não é root (configurado abaixo)
USER appuser

EXPOSE 3000

CMD ["node", "dist/server.js"]
