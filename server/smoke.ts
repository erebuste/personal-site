// End-to-end check of the auth/validation paths against a running server.
// Re-saves the current profile unchanged and leaves one 4-byte test .png in uploads.
//   ADMIN_PASSWORD=... node server/smoke.ts            (defaults to http://localhost:3001)
//   BASE=http://localhost:3000 ADMIN_PASSWORD=... node server/smoke.ts   (through nginx)
import assert from 'node:assert/strict';

const BASE = process.env.BASE ?? 'http://localhost:3001';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
assert.ok(PASSWORD, 'set ADMIN_PASSWORD to the server password');

let cookie = '';
const req = (path: string, init: RequestInit = {}) =>
  fetch(BASE + path, { ...init, headers: { cookie, origin: BASE, ...init.headers } });
const json = (body: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(body),
  headers: { 'content-type': 'application/json' },
});

// Not logged in: admin routes refuse.
assert.equal((await req('/api/admin/stats')).status, 401);
assert.equal((await req('/api/login', json({ password: 'wrong' }))).status, 401);

// Log in.
const login = await req('/api/login', json({ password: PASSWORD }));
assert.equal(login.status, 200);
cookie = (login.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
assert.match(cookie, /^session=\d+\./);
assert.equal(((await (await req('/api/session')).json()) as { authed: boolean }).authed, true);

// Tampered cookie is rejected.
const good = cookie;
cookie = good.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'));
assert.equal((await req('/api/admin/stats')).status, 401);
cookie = good;

// Validation: javascript: links and bad colors never reach disk.
const { profile } = (await (await req('/api/profile')).json()) as { profile: Record<string, unknown> & { theme: object } };
const put = (p: unknown) => req('/api/admin/profile', { method: 'PUT', body: JSON.stringify(p), headers: { 'content-type': 'application/json' } });
const xss = { ...profile, links: [{ platform: 'website', title: 'x', action: { type: 'url', href: 'javascript:alert(1)' } }] };
assert.equal((await put(xss)).status, 400);
assert.equal((await put({ ...profile, theme: { ...profile.theme, accent: 'red;}' } })).status, 400);
assert.equal((await put(profile)).status, 200);

// Uploads: extension whitelist, random server-side name.
const upload = (name: string) => {
  const form = new FormData();
  form.append('kind', 'image');
  form.append('file', new Blob([new Uint8Array([137, 80, 78, 71])]), name);
  return req('/api/admin/upload', { method: 'POST', body: form });
};
assert.equal((await upload('evil.html')).status, 400);
assert.equal((await upload('evil.svg')).status, 400);
const ok = await upload('fine.png');
assert.equal(ok.status, 200);
assert.match(((await ok.json()) as { url: string }).url, /^\/uploads\/[a-f0-9]{24}\.png$/);

// Cross-site form posts are blocked by the CSRF origin check.
const csrf = await fetch(`${BASE}/api/admin/upload`, { method: 'POST', body: new FormData(), headers: { cookie, origin: 'https://evil.example' } });
assert.equal(csrf.status, 403);

console.log('smoke: all checks passed');
