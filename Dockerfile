FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

# Dossier d'upload (UPLOAD_DIR, defaut: ./uploads) dont le contenu est servi
# tel quel sous /uploads (middleware Express, hors prefixe applicatif) : il
# doit etre accessible en ecriture par l'utilisateur node.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

USER node
EXPOSE 3004

CMD ["npm", "run", "start:prod"]