# personal-site

A self-hosted bio-link page: one glass profile card with links, music, showcases, a live Discord
presence card and a pile of optional effects (page overlays, cursor trails, animated username and
tab title). Everything is edited from a password-protected dashboard at `/admin`; no rebuild needed.

**Stack:** React 19 + TypeScript + Tailwind 4 (Vite) · Hono API on Node 24 · nginx · Docker Compose.
Settings and uploads are plain files in `./data`, so no database is needed.

## Quick start (Docker)

A server only needs two files: `docker-compose.yml` and a `.env` (copy `.env.example`, then set
`ADMIN_PASSWORD` and `SESSION_SECRET`, e.g. `openssl rand -hex 32`).

```sh
docker compose up -d
```

`./data` is created on first start; the one-shot `init` service hands it to the api's user.

Out of the box the site listens on `172.17.0.1:3000`, the Docker bridge on a Linux host, for a reverse
proxy on the same machine to forward to. For local testing, swap the two `ports:` lines in
`docker-compose.yml` to `3000:80` and open <http://localhost:3000> (and `/admin`).

Update to the latest images: `docker compose pull && docker compose up -d`.
Logs: `docker compose logs -f api`.

## Images

Every push to `main` runs `.github/workflows/docker.yml`, which publishes the public images
`ghcr.io/erebuste/personal-site-api` and `-web`, tagged `latest` and `sha-<commit>`.

- **Roll back / pin a version:** change `:latest` to `:sha-<commit>` in both `image:` lines, then
  `docker compose up -d`.
- **Test local changes:** `docker build --target api -t personal-site-api:local .` (and `--target web`
  for `personal-site-web:local`), then switch to the commented `#For testing` image lines.

## Configuration (`.env`)

| Variable | Required | What it does |
|---|---|---|
| `ADMIN_PASSWORD` | yes | Password for `/admin`. Without it the site runs but admin login is disabled. |
| `SESSION_SECRET` | yes | Signs login sessions; at least 32 characters (`openssl rand -hex 32`). The api refuses to start without one. |
| `UID` / `GID` | no | User and group the api runs as and `./data` is owned by (default `1000`). Set them to `id -u` / `id -g` so you can manage `./data` without sudo. |
| `COOKIE_SECURE` | no | Set to `true` only once the site is served over HTTPS. It marks the cookie Secure and turns on HSTS. |
| `DISCORD_BOT_TOKEN` | no | Your own bot for the Discord presence card. Setup steps are in `.env.example`. Leave it empty to disable the card. |

Only the api gets `.env`; the nginx container never sees your secrets.

## How it runs

```
browser ──► reverse proxy ──► web (nginx :80, published on 172.17.0.1:3000)
                                ├─ static frontend (dist/) and /uploads/* straight from ./data
                                └─ everything else ──► api (Node :3001, not published)
                                                           └─ ./data: profile.json, views.json, uploads/
```

Start order: `init` (fixes `./data` ownership, then exits) → `api` (until its healthcheck passes) → `web`.
If the api restarts, `web` restarts with it.

- The **api** renders each page's `<head>` (title, embed/OG tags) from the saved profile. It also serves
  `/api/*`: profile, login/logout, uploads (100 MB max), view counter and Discord presence.
- It is only reachable through nginx, which is why it can trust `X-Real-IP` for login rate-limiting.
- All settings are validated against a single zod schema (`src/types/index.ts`) on both save and load.

### Data and backups

Everything lives in `./data`: `profile.json` (all settings), `views.json` and `uploads/`. Back it up
with `tar czf site-data.tgz data`.

Moving from an older setup that used the `personal-site_data` named volume? Copy it over once:

```sh
docker run --rm -v personal-site_data:/from -v "$PWD/data":/to alpine cp -a /from/. /to/
```

If a saved `profile.json` ever fails validation, the site serves the defaults instead of going down.
A copy of the original is kept as `profile.invalid-<timestamp>.json` next to it.

### HTTPS / reverse proxy

The containers speak plain HTTP. Point a TLS-terminating proxy (Caddy, nginx, Traefik, …) at
`172.17.0.1:3000`, then set `COOKIE_SECURE=true`. The proxy must send `X-Forwarded-For` (Caddy and
Traefik do by default; for nginx: `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`).
`nginx.conf` trusts that header only from Docker's `172.16.0.0/12` range, so login rate-limiting and
the view counter see each visitor's real IP.

## Local development

Requires Node 24 (the server runs `.ts` directly).

```sh
npm install
ADMIN_PASSWORD=dev npm run server   # API on :3001, data in ./data
npm run dev                         # Vite on :5173, proxies /api and /uploads to :3001
```

| Command | |
|---|---|
| `npm run build` | Type-check and build the frontend into `dist/` |
| `npm run typecheck` | Type-check only |
| `node src/lib/titleFrames.check.ts` | Title-animation frame checks |
| `node server/discord.check.ts` | Discord bot checks against a fake gateway (never contacts Discord) |
| `BASE=http://localhost:3000 ADMIN_PASSWORD=… node server/smoke.ts` | End-to-end smoke test (login, CSRF, validation, persistence) |

## Project layout

```
server/            Hono API: index.ts (routes), store.ts (profile/views on disk), discord.ts (presence bot)
src/types/         Profile schema: the single source of truth for every setting
src/components/    Public page: profile card, links, audio player, showcases, effects
src/lib/           Cursor trails (canvas), tab-title animation frames, box styling
src/admin/         Dashboard: pages/ (Profile, Appearance, Options, …), shared form UI, draft state
src/index.css      All CSS animations: overlays, entrances, username effects
nginx.conf         Static files, security headers/CSP, proxy to the api
```

### Adding an effect

Each effect list is a `const` array in `src/types/index.ts`. Add the new value there, and the type
checker will then point at every `Record` that is missing it: its admin label in
`src/admin/pages/Appearance.tsx`, plus the frame function (`titleFrames.ts`) or canvas trail
(`cursorEffects.ts`). CSS-driven effects just need a matching `.overlay-*`, `.enter-*` or `.fx-*`
class in `index.css`.
