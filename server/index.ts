import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { csrf } from 'hono/csrf';
import { profileSchema, type ProfileConfig, type PublicProfileResponse } from '../src/types/index.ts';
import { startPresenceBot } from './discord.ts';
import { UPLOAD_DIR, countView, getProfile, saveProfile, stats } from './store.ts';

const PORT = Number(process.env.PORT ?? 3001);
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
// Signs the session cookie, so a short or guessable one lets anyone forge an admin login.
const ENV_SECRET = process.env.SESSION_SECRET ?? '';
if (ENV_SECRET.length < 32) {
  const problem = 'SESSION_SECRET is missing or shorter than 32 characters (generate one with: openssl rand -hex 32)';
  if (process.env.NODE_ENV === 'production') {
    console.error(problem);
    process.exit(1);
  }
  console.warn(`${problem}. Using a random one for now: sessions end when the server restarts.`);
}
const SECRET = ENV_SECRET.length >= 32 ? ENV_SECRET : randomBytes(32).toString('hex');
const SECURE_COOKIE = process.env.COOKIE_SECURE === 'true';
const DIST = join(import.meta.dirname, '..', 'dist');
const SESSION_MS = 7 * 86_400_000;
const MAX_UPLOAD = 100 * 1024 * 1024;

if (!PASSWORD) console.warn('ADMIN_PASSWORD is not set: /admin login is disabled.');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN ?? '';
const getPresence = BOT_TOKEN ? startPresenceBot(BOT_TOKEN) : null;
if (!BOT_TOKEN) console.warn('DISCORD_BOT_TOKEN is not set: Discord presence is disabled.');

// ---- auth: stateless HMAC-signed cookie `<expiry>.<signature>` ----
// ponytail: logout only clears the cookie; rotate SESSION_SECRET to revoke every session.

const sha = (s: string) => createHash('sha256').update(s).digest();
const safeEqual = (a: string, b: string) => timingSafeEqual(sha(a), sha(b));
const sign = (value: string) => createHmac('sha256', SECRET).update(value).digest('base64url');

function isAuthed(c: Context): boolean {
  const [exp, sig] = (getCookie(c, 'session') ?? '').split('.');
  return !!exp && !!sig && Number(exp) > Date.now() && safeEqual(sig, sign(exp));
}

// Only nginx can reach this server in docker-compose, so its X-Real-IP is trustworthy.
const clientIp = (c: Context) => c.req.header('x-real-ip') ?? 'direct';

const attempts = new Map<string, { count: number; resetAt: number }>();
function allowLoginAttempt(ip: string): boolean {
  const now = Date.now();
  if (attempts.size > 10_000) {
    for (const [key, entry] of attempts) if (entry.resetAt < now) attempts.delete(key);
    // ponytail: still full means >10k IPs guessing at once; they get 10 tries each anyway, so just reset.
    if (attempts.size > 10_000) attempts.clear();
  }
  const a = attempts.get(ip);
  if (!a || a.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60_000 });
    return true;
  }
  return ++a.count <= 10;
}

// ---- index.html with per-profile <head> (link-preview crawlers don't run JS) ----

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function headTags({ page, embed, user }: ProfileConfig): string {
  const image = new URL(embed.image ?? user.avatarUrl, embed.siteUrl).href;
  const meta: [string, string][] = [
    ['theme-color', embed.color],
    ['og:site_name', embed.siteName],
    ['og:title', embed.title],
    ['og:description', embed.description],
    ['og:url', embed.siteUrl],
    ['og:image', image],
    ['twitter:card', embed.image ? 'summary_large_image' : 'summary'],
  ];
  return [
    `<title>${esc(page.title)}</title>`,
    `<link rel="icon" href="${esc(page.favicon ?? user.avatarUrl)}" />`,
    ...meta
      .filter(([, v]) => v)
      .map(([k, v]) => `<meta ${k.startsWith('og:') ? 'property' : 'name'}="${k}" content="${esc(v)}" />`),
  ].join('\n    ');
}

const BOT_UA = /bot|crawl|spider|preview|embed|discord|slack|telegram|whatsapp|facebook/i;

// ---- uploads ----

const IMAGE = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const ALLOWED = { image: IMAGE, media: [...IMAGE, '.mp4'], audio: ['.mp3', '.ogg', '.wav', '.flac', '.m4a', '.mp4'] };
const isUploadKind = (k: unknown): k is keyof typeof ALLOWED => typeof k === 'string' && Object.hasOwn(ALLOWED, k);

// ---- routes ----

const app = new Hono();

// HSTS only once the site is on HTTPS (same switch as the secure cookie). Browsers apply it to the whole host,
// so sending it on the pages and API is enough even though nginx serves the static files.
if (SECURE_COOKIE)
  app.use('*', async (c, next) => {
    await next();
    c.res.headers.set('Strict-Transport-Security', 'max-age=31536000');
  });

app.use('/api/*', csrf()); // rejects cross-origin form/multipart posts

app.get('/api/profile', (c) => {
  const profile = getProfile();
  const body: PublicProfileResponse = { profile };
  if (profile.page.showViews || isAuthed(c)) body.views = stats().total;
  return c.json(body, 200, { 'Cache-Control': 'no-store' });
});

app.get('/api/session', (c) => c.json({ authed: isAuthed(c), enabled: PASSWORD !== '' }));

app.post('/api/login', async (c) => {
  if (!PASSWORD) return c.json({ error: 'Admin is disabled. Set ADMIN_PASSWORD on the server.' }, 503);
  if (!allowLoginAttempt(clientIp(c))) return c.json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429);
  const body: unknown = await c.req.json().catch(() => null);
  const password =
    typeof body === 'object' && body !== null && 'password' in body && typeof body.password === 'string' ? body.password : '';
  if (!safeEqual(password, PASSWORD)) return c.json({ error: 'Wrong password.' }, 401);

  const exp = String(Date.now() + SESSION_MS);
  setCookie(c, 'session', `${exp}.${sign(exp)}`, {
    httpOnly: true,
    sameSite: 'Strict',
    secure: SECURE_COOKIE,
    path: '/',
    maxAge: SESSION_MS / 1000,
  });
  return c.json({ ok: true });
});

app.post('/api/logout', (c) => {
  deleteCookie(c, 'session', { path: '/' });
  return c.json({ ok: true });
});

// Only the saved profile's user ID is ever looked up, so visitors can't use the bot to query other people.
app.get('/api/presence', async (c) => {
  const { enabled, userId } = getProfile().discordPresence;
  const data = getPresence && enabled && userId ? await getPresence(userId) : null;
  return data ? c.json(data, 200, { 'Cache-Control': 'no-store' }) : c.json({ error: 'Presence unavailable.' }, 404);
});

app.use('/api/admin/*', async (c, next) => {
  if (!isAuthed(c)) return c.json({ error: 'Not logged in.' }, 401);
  await next();
});

app.get('/api/admin/stats', (c) => c.json(stats()));

app.put('/api/admin/profile', async (c) => {
  const parsed = profileSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    const error = parsed.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('\n');
    return c.json({ error }, 400);
  }
  await saveProfile(parsed.data);
  return c.json(parsed.data);
});

app.post(
  '/api/admin/upload',
  bodyLimit({ maxSize: MAX_UPLOAD, onError: (c) => c.json({ error: 'File is larger than 100MB.' }, 413) }),
  async (c) => {
    const form = await c.req.parseBody();
    const { file, kind } = form;
    if (!(file instanceof File) || !isUploadKind(kind)) return c.json({ error: 'Invalid upload.' }, 400);
    const ext = extname(file.name).toLowerCase();
    if (!ALLOWED[kind].includes(ext)) return c.json({ error: `Allowed: ${ALLOWED[kind].join(', ')}` }, 400);

    // Random name + whitelisted extension; files are served with nosniff, so content can't be reinterpreted.
    const name = randomBytes(12).toString('hex') + ext;
    // Streamed from the parsed File, so the upload isn't copied into a second full-size Buffer first.
    await writeFile(join(UPLOAD_DIR, name), file.stream());
    return c.json({ url: `/uploads/${name}` });
  },
);

app.all('/api/*', (c) => c.json({ error: 'Not found.' }, 404));

// nginx serves /uploads directly in production; this covers `npm run dev`.
app.use('/uploads/*', serveStatic({ root: UPLOAD_DIR, rewriteRequestPath: (p) => p.replace(/^\/uploads/, '') }));

// The only pages: the profile at / and the dashboard under /admin. Anything else is a real 404 (and no view).
const isPage = (path: string) => path === '/' || /^\/admin(\/|$)/.test(path);

let template: string | undefined;
app.get('*', async (c) => {
  if (!isPage(c.req.path)) return c.text('Not found', 404);
  template ??= await readFile(join(DIST, 'index.html'), 'utf8').catch(() => undefined);
  if (!template) return c.text('Frontend not built. Run `npm run build`, or use the Vite dev server.', 503);

  const ua = c.req.header('user-agent') ?? '';
  if (!c.req.path.startsWith('/admin') && !BOT_UA.test(ua) && !isAuthed(c)) countView(`${clientIp(c)}|${ua}`);

  // Function replacer: a string one would expand `$'`/`$&` in the title into chunks of the template.
  return c.html(template.replace('<!--app-head-->', () => headTags(getProfile())), 200, { 'Cache-Control': 'no-cache' });
});

serve({ fetch: app.fetch, port: PORT }, (info) => console.log(`API listening on :${info.port}`));
