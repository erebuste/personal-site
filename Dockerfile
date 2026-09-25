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
# su-exec: lets the entrypoint drop from root to UID:GID after fixing /data ownership.
RUN apk add --no-cache su-exec
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY src/types ./src/types
COPY src/config ./src/config
COPY --from=build /app/dist ./dist
# No USER: server/entrypoint.sh starts as root, hands /data to UID:GID, then runs the server as that user.
EXPOSE 3001
ENTRYPOINT ["sh", "/app/server/entrypoint.sh"]
CMD ["node", "server/index.ts"]

# ---- web: nginx for static assets + uploads, proxies the rest to api ----
FROM nginx:alpine AS web
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1/index.html || exit 1
