# syntax=docker/dockerfile:1

# ---- build: typecheck + bundle the frontend ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- api: settings, login, uploads, view counter, per-profile <head> ----
FROM node:24-alpine AS api
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data PORT=3001
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY src/types ./src/types
COPY src/config ./src/config
COPY --from=build /app/dist ./dist
# The named volume inherits this ownership on first mount.
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 3001
CMD ["node", "server/index.ts"]

# ---- web: nginx for static assets + uploads, proxies the rest to api ----
FROM nginx:alpine AS web
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1/index.html || exit 1
