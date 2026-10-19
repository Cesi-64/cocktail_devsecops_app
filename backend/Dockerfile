# syntax=docker/dockerfile:1
# ---------------------------------------------------------------
# Étape 1 : installation des dépendances de production uniquement
# ---------------------------------------------------------------
FROM node:26-alpine AS deps
WORKDIR /app
# bcrypt est un module natif : outils de compilation nécessaires ici seulement
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------------------------------------------------------------
# Étape 2 : image finale minimale, sans outils de build, non-root
# ---------------------------------------------------------------
FROM node:26-alpine
ENV NODE_ENV=production \
    SERVER_PORT=12000
WORKDIR /app

# npm/yarn sont inutiles à l'exécution (on lance "node" directement) et embarquent
# leurs propres dépendances, souvent signalées par Trivy : on réduit la surface d'attaque.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json server.js ./
COPY --chown=node:node api ./api

# L'image node fournit l'utilisateur "node" (uid 1000) : on ne tourne jamais en root
USER node
EXPOSE 12000

HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.SERVER_PORT||12000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Synchronise le schéma puis démarre l'API (exec : node reçoit bien les signaux)
CMD ["sh", "-c", "node ./api/config/init_bdd.js && exec node server.js"]
