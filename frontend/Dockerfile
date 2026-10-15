# syntax=docker/dockerfile:1
# ---------------------------------------------------------------
# Étape 1 : build de l'application React (Vite)
# ---------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
# Inutile de télécharger le binaire Cypress (300 Mo) pour un build
ENV CYPRESS_INSTALL_BINARY=0
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Le build lit .env.production : l'API est appelée sur /api (même domaine).
# L'image est donc identique pour le staging et la prod (Build once, Scan, Promote).
RUN npm run build

# ---------------------------------------------------------------
# Étape 2 : nginx non-root qui sert les fichiers statiques
# ---------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
