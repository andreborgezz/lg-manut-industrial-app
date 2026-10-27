# Este Dockerfile é usado apenas para builds locais/CI independentes do front.
# Em produção, o Caddy (caddy/Dockerfile) faz o build do front e serve os estáticos.

FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build
