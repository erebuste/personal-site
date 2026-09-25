import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import type { ProfileConfig } from '../src/types/index.ts';
import { UPLOAD_DIR } from './store.ts';

// Link-preview card (og:image): the profile drawn as a 1200×630 PNG. satori lays it out as SVG, resvg rasterises it.

const W = 1200;
const H = 630;
const ROOT = join(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');
const MAX_IMAGE = 8 * 1024 * 1024;
const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

// satori reads woff/ttf but not woff2, so these come from the static @fontsource package.
// ponytail: latin + latin-ext only; other scripts and emoji in a name or bio render as blanks.
const fonts = Promise.all(
  (['latin', 'latin-ext'] as const).flatMap((subset) =>
    ([400, 700] as const).map(async (weight) => ({
      name: 'Unbounded',
      weight,
      style: 'normal' as const,
      data: await readFile(join(ROOT, `node_modules/@fontsource/unbounded/files/unbounded-${subset}-${weight}-normal.woff`)),
    })),
  ),
);

/** Changes whenever anything drawn on the card changes; used as the ?v= cache-buster and the render cache key. */
export const ogVersion = ({ user, theme, background, embed }: ProfileConfig) =>
  createHash('sha1').update(JSON.stringify([user, theme, background, embed.siteUrl])).digest('hex').slice(0, 12);

/** An image from the profile as a data: URI, or null if it's missing, too big, or not a still image (video). */
async function imageData(src: string | null): Promise<string | null> {
  if (!src) return null;
  try {
    let bytes: Buffer;
    let type: string | undefined;
    if (src.startsWith('https://')) {
      const res = await fetch(src, { signal: AbortSignal.timeout(5000) });
      if (!res.ok || Number(res.headers.get('content-length') ?? 0) > MAX_IMAGE) return null;
      type = res.headers.get('content-type')?.split(';')[0];
      bytes = Buffer.from(await res.arrayBuffer());
    } else {
      const [base, rel] = src.startsWith('/uploads/') ? [UPLOAD_DIR, src.slice('/uploads/'.length)] : [DIST, src];
      const path = resolve(base, `.${sep}${rel}`);
      if (!path.startsWith(resolve(base) + sep)) return null; // stay inside uploads/ or dist/
      bytes = await readFile(path);
      type = MIME[extname(path).toLowerCase()];
    }
    if (!type?.startsWith('image/') || bytes.length > MAX_IMAGE) return null;
    return `data:${type};base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
}

/** Cut at the last word boundary before `max` characters (satori ignores line-clamp here, so do it up front). */
function clip(text: string, max: number): string {
  const chars = [...text];
  if (chars.length <= max) return text;
  const cut = chars.slice(0, max).join('');
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, '')}…`;
}

/** #rrggbb + opacity 0..1 → #rrggbbaa */
const alpha = (hex: string, a: number) => hex + Math.round(a * 255).toString(16).padStart(2, '0');

type El = { type: string; props: Record<string, unknown> };
// satori requires display:flex on any div given an array of children, even an array of one, so unwrap singles.
const el = (type: string, style: Record<string, unknown>, ...children: (El | string | null)[]): El => {
  const kept = children.filter((c) => c !== null);
  return { type, props: { style, children: kept.length === 1 ? kept[0] : kept } };
};
const img = (src: string, style: Record<string, unknown>): El => ({ type: 'img', props: { src, style } });

async function render(p: ProfileConfig): Promise<Buffer> {
  const { user, theme, background } = p;
  const [avatar, bg] = await Promise.all([imageData(user.avatarUrl), imageData(background.src)]);
  const host = URL.canParse(p.embed.siteUrl) ? new URL(p.embed.siteUrl).host : '';
  const bio = clip(
    user.description
      .split('\n')
      .filter((line) => line.trim() !== '[hr-theme]')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
    100, // about two lines at this size
  );
  const AVATAR = 176; // the page shows it at 88px; keep the same corner shape at twice the size
  const radius = Math.min(user.avatarRadius * (AVATAR / 88), AVATAR / 2);

  const card = el(
    'div',
    {
      width: W,
      height: H,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: background.color,
      fontFamily: 'Unbounded',
      color: theme.primaryText,
    },
    bg ? img(bg, { position: 'absolute', inset: 0, width: W, height: H, objectFit: 'cover', opacity: background.opacity / 100 }) : null,
    // Accent glows over a darkening wash, so the text reads on any background.
    el('div', {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      backgroundImage: `radial-gradient(circle at 12% 0%, ${alpha(theme.accent, 0.4)}, transparent 55%), radial-gradient(circle at 100% 100%, ${alpha(theme.accent, 0.22)}, transparent 50%), linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.55))`,
    }),
    el(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: 940,
        padding: '52px 64px',
        borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.14)',
      },
      avatar
        ? img(avatar, { width: AVATAR, height: AVATAR, borderRadius: radius, objectFit: 'cover', border: `4px solid ${alpha(theme.accent, 0.7)}` })
        : el(
            'div',
            {
              width: AVATAR,
              height: AVATAR,
              borderRadius: radius,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.accent,
              color: background.color, // accent is often white, so primary text on it would vanish
              fontSize: 80,
              fontWeight: 700,
            },
            [...user.username][0]?.toUpperCase() ?? '?',
          ),
      el('div', { marginTop: 28, fontSize: 64, fontWeight: 700, letterSpacing: -1.5 }, user.username),
      bio
        ? el(
            'div',
            { marginTop: 18, fontSize: 26, lineHeight: 1.45, color: theme.secondaryText, textAlign: 'center' },
            bio,
          )
        : null,
    ),
    host ? el('div', { position: 'absolute', bottom: 30, fontSize: 22, color: alpha(theme.secondaryText, 0.85) }, host) : null,
  );

  const svg = await satori(card as never, { width: W, height: H, fonts: await fonts });
  return new Resvg(svg, { fitTo: { mode: 'original' } }).render().asPng();
}

let cache: { version: string; png: Promise<Buffer> } | undefined;

/** The card for this profile, rendered once per version (so crawlers can't make the server re-render it). */
export function ogImage(profile: ProfileConfig): Promise<Buffer> {
  const version = ogVersion(profile);
  if (cache?.version !== version) {
    const png = render(profile);
    cache = { version, png };
    png.catch(() => {
      if (cache?.png === png) cache = undefined; // let the next request retry
    });
  }
  return cache.png;
}
