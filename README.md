# personal-site

A self-hosted bio-link page: one glass profile card with links, music, showcases, a live Discord
presence card and a pile of optional effects (page overlays, cursor trails, animated username and
tab title). Everything is edited from a password-protected dashboard at `/admin`; no rebuild needed.

**Stack:** React 19 + TypeScript + Tailwind 4 (Vite) · Hono API on Node 24 · nginx · Docker Compose.
Settings and uploads are plain files on a volume, so no database is needed.

## Quick start (Docker)

```sh
cp .env.example .env      # then set ADMIN_PASSWORD (and SESSION_SECRET: openssl rand -hex 32)
docker compose up -d --build
```

Open <http://localhost:3000>, then <http://localhost:3000/admin> to log in and set up the page.

Rebuild after pulling or changing code: `docker compose up -d --build`.
Logs: `docker compose logs -f api`.

## Deploy prebuilt images from GitHub

Every push to `main` runs `.github/workflows/docker.yml`, which publishes
`ghcr.io/<owner>/<repo>-api` and `-web`, tagged `latest` and `sha-<commit>`. A server then only needs
`docker-compose.yml` and a `.env` containing (lowercase owner/repo):

```sh
IMAGE=ghcr.io/<your-github-user>/personal-site
```

Update to the latest build:

```sh
docker compose pull && docker compose up -d
```

To roll back, set `TAG=sha-<commit>` in `.env` and run the same command.

GitHub packages start out private. Either make them public (the package's settings on GitHub), or log
the server in once with a token that has `read:packages`:
`echo <token> | docker login ghcr.io -u <your-github-user> --password-stdin`.

## Configuration (`.env`)

| Variable | Required | What it does |
|---|---|---|
| `ADMIN_PASSWORD` | yes | Password for `/admin`. Compose refuses to start without it. |
| `SESSION_SECRET` | recommended | Signs login sessions. Without it you're logged out on every restart. |
| `WEB_PORT` | no | Host port for the site (default `3000`). |
| `IMAGE` / `TAG` | no | Pull prebuilt images from GitHub instead of building locally (see above). |
| `COOKIE_SECURE` | no | Set to `true` only once the site is served over HTTPS. It marks the cookie Secure and turns on HSTS. |
| `DISCORD_BOT_TOKEN` | no | Your own bot for the Discord presence card. Setup steps are in `.env.example`. Leave it empty to disable the card. |

## How it runs

```
browser ──► web (nginx :80, published on WEB_PORT)
              ├─ static frontend (dist/) and /uploads/* straight from the volume
              └─ everything else ──► api (Node :3001, not published)
                                         └─ /data volume: profile.json, views.json, uploads/
```

- The **api** renders each page's `<head>` (title, embed/OG tags) from the saved profile. It also serves
  `/api/*`: profile, login/logout, uploads (100 MB max), view counter and Discord presence.
- It is only reachable through nginx, which is why it can trust `X-Real-IP` for login rate-limiting.
- All settings are validated against a single zod schema (`src/types/index.ts`) on both save and load.

### Data and backups

Everything lives in the `personal-site_data` volume: `profile.json` (all settings), `views.json` and
`uploads/`. Back it up with:

```sh
docker run --rm -v personal-site_data:/data -v "$PWD":/backup alpine tar czf /backup/site-data.tgz -C /data .
```

If a saved `profile.json` ever fails validation, the site serves the defaults instead of going down.
A copy of the original is kept as `profile.invalid-<timestamp>.json` next to it.

### HTTPS / reverse proxy

The containers speak plain HTTP. Put a TLS-terminating proxy (Caddy, Cloudflare, Traefik, …) in front
of `WEB_PORT`, then set `COOKIE_SECURE=true`. If that proxy sits between visitors and nginx, add
`set_real_ip_from` / `real_ip_header` in `nginx.conf` (see the comment there). Otherwise every visitor
shares the proxy's IP for login rate-limiting.

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
