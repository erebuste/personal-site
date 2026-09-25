import { z } from 'zod';

// The schema is the single source of truth: the server validates every save against it,
// the frontend uses the inferred types. Ranges mirror the fakecrime dashboard sliders.

export const PLATFORMS = [
  'website',
  'steam',
  'youtube',
  'discord',
  'github',
  'x',
  'instagram',
  'tiktok',
  'spotify',
  'twitch',
  'telegram',
] as const;

export const CURSOR_TRAILS = [
  'none',
  'fairy-dust',
  'bubbles',
  'snow',
  'rainbow',
  'ghost',
  'follow',
  'emoji',
  'hearts',
  'stars',
  'fire',
  'comet',
  'matrix',
  'ripple',
  'confetti',
  'neon',
  'orbit',
  'petals',
  'pixels',
  'smoke',
  'sparks',
  'notes',
] as const;
export const PAGE_OVERLAYS = [
  'none',
  'glitch',
  'crt',
  'vhs',
  'grain',
  'rain',
  'storm',
  'snow',
  'sakura',
  'leaves',
  'fireflies',
  'embers',
  'hearts',
  'bubbles',
  'stars',
  'aurora',
  'matrix',
  'meteors',
  'confetti',
  'fog',
  'sunbeams',
  'dust',
  'vignette',
] as const;
export const ENTER_ANIMATIONS = [
  'none',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'fade',
  'zoom-in',
  'zoom-out',
  'blur-in',
  'flip',
  'bounce',
  'rotate-in',
  'swing',
  'elastic',
  'unfold',
  'glitch-in',
  'drop',
  'spiral',
  'card-flip',
  'jelly',
  'wipe',
  'iris',
  'skew',
  'tilt',
] as const;
export const TITLE_ANIMATIONS = [
  'none',
  'typing',
  'scroll',
  'blink',
  'wave',
  'glitch',
  'decrypt',
  'sparkle',
  'bounce',
  'dots',
  'spinner',
  'heartbeat',
  'reveal',
  'progress',
  'clock',
  'moon',
  'music',
  'upside-down',
  'expand',
] as const;
export const USERNAME_EFFECTS = [
  'none',
  'glow',
  'neon',
  'rainbow',
  'shimmer',
  'glitch',
  'wave',
  'typewriter',
  'fire',
  'pulse',
  'chromatic',
  'outline',
  'float',
  'retro',
  'gradient',
  'gold',
  'hologram',
  'shake',
  'swing',
  'jelly',
  'spin',
  'focus',
] as const;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a #rrggbb color');
const pct = z.number().int().min(0).max(100);
const int = (min: number, max: number) => z.number().int().min(min).max(max);
/** Site-relative path or https URL. Blocks javascript:/data: URLs. */
const media = z
  .string()
  .max(500)
  .regex(/^(\/(?!\/)|https:\/\/)/, 'must be a /path or https:// URL')
  // The server builds og:image with new URL(); an unparseable one would make every page render throw.
  .refine((s) => s.startsWith('/') || URL.canParse(s), 'must be a valid URL');
/** http(s) only, so links can't carry javascript: URLs. */
const httpUrl = z
  .string()
  .max(250)
  .refine((s) => /^https?:\/\//i.test(s) && URL.canParse(s), 'must be an http(s) URL');

/** Saved profiles from before overlays had types store `glitchOverlay: boolean`; carry it over to `overlay`. */
const migrateOverlay = (page: unknown) =>
  typeof page === 'object' && page !== null && 'glitchOverlay' in page && typeof page.glitchOverlay === 'boolean'
    ? { ...page, overlay: page.glitchOverlay ? 'glitch' : 'none' }
    : page;

export const profileSchema = z.object({
  user: z.object({
    username: z.string().trim().min(1).max(25),
    avatarUrl: media,
    avatarRadius: int(0, 50),
    bannerUrl: media.nullable(),
    /** Plain text lines; a line containing only `[hr-theme]` renders a theme-colored divider. */
    description: z.string().max(2000),
    location: z.string().max(50),
  }),
  links: z
    .array(
      z.object({
        platform: z.enum(PLATFORMS),
        title: z.string().trim().min(1).max(75),
        action: z.discriminatedUnion('type', [
          z.object({ type: z.literal('url'), href: httpUrl }),
          z.object({ type: z.literal('copy'), value: z.string().min(1).max(250) }),
        ]),
      }),
    )
    .max(50),
  /** Image cards under the profile card. */
  showcases: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(75),
        description: z.string().max(250),
        image: media,
        href: httpUrl.nullable(),
      }),
    )
    .max(12),
  audio: z.object({
    src: media.nullable(),
    title: z.string().max(100),
    cover: media.nullable(),
    volume: pct,
    showPlayer: z.boolean(),
  }),
  theme: z.object({
    accent: hex,
    primaryText: hex,
    secondaryText: hex,
    /** "Theme" option: glow icons with the accent color. */
    iconGlow: z.boolean(),
    sparkles: z.object({ enabled: z.boolean(), color: hex }),
    usernameEffect: z.enum(USERNAME_EFFECTS),
  }),
  box: z.object({
    width: int(300, 1500),
    padding: int(0, 100),
    color: hex,
    opacity: pct,
    blur: int(0, 100),
    radius: int(0, 50),
    shadowColor: hex,
    shadowOpacity: pct,
    borderWidth: int(0, 5),
    borderColor: hex,
    borderOpacity: pct,
    borderStyle: z.enum(['solid', 'dashed', 'dotted']),
  }),
  background: z.object({
    src: media.nullable(),
    color: hex,
    blur: int(0, 100),
    opacity: pct,
    size: z.enum(['cover', 'contain']),
  }),
  page: z.preprocess(migrateOverlay, z.object({
    title: z.string().trim().min(1).max(100),
    favicon: media.nullable(),
    // Was a boolean (typing on/off) before there were several; map old saved values.
    titleAnimation: z.preprocess((v) => (v === true ? 'typing' : v === false ? 'none' : v), z.enum(TITLE_ANIMATIONS)),
    titleSpeedMs: int(100, 500),
    // Was a boolean (slide up on/off); map old saved values.
    enterAnimation: z.preprocess((v) => (v === true ? 'slide-up' : v === false ? 'none' : v), z.enum(ENTER_ANIMATIONS)),
    enterAnimationMs: int(100, 1000),
    overlay: z.enum(PAGE_OVERLAYS),
    // Was a boolean before multiple trails existed; map old saved values instead of rejecting them.
    cursorTrail: z.preprocess((v) => (v === true ? 'fairy-dust' : v === false ? 'none' : v), z.enum(CURSOR_TRAILS)),
    cursorEmoji: z.string().trim().min(1).max(16),
    showViews: z.boolean(),
    reveal: z.object({ enabled: z.boolean(), text: z.string().max(1000), blur: int(0, 50) }),
  })),
  embed: z.object({
    /** Public origin; crawlers need absolute image URLs. */
    siteUrl: httpUrl,
    siteName: z.string().max(50),
    title: z.string().trim().min(1).max(100),
    description: z.string().max(250),
    color: hex,
    image: media.nullable(),
  }),
  discordPresence: z.object({
    enabled: z.boolean(),
    userId: z.string().regex(/^\d{0,20}$/, 'must be a numeric Discord user ID'),
  }),
});

export type ProfileConfig = z.infer<typeof profileSchema>;
export type UserProfile = ProfileConfig['user'];
export type SocialLink = ProfileConfig['links'][number];
export type Platform = SocialLink['platform'];
export type Showcase = ProfileConfig['showcases'][number];
export type AudioTrackConfig = ProfileConfig['audio'];
export type ThemeConfig = ProfileConfig['theme'];
export type BoxConfig = ProfileConfig['box'];
export type BackgroundConfig = ProfileConfig['background'];
export type PageConfig = ProfileConfig['page'];
export type CursorTrail = PageConfig['cursorTrail'];
export type TitleAnimation = PageConfig['titleAnimation'];
export type PageOverlay = PageConfig['overlay'];
export type EnterAnimation = PageConfig['enterAnimation'];
export type UsernameEffect = ThemeConfig['usernameEffect'];

/** GET /api/profile */
export interface PublicProfileResponse {
  profile: ProfileConfig;
  /** Present only when page.showViews is on (or you're logged in). */
  views?: number;
}

/** GET /api/stats */
export interface StatsResponse {
  total: number;
  lastWeek: { date: string; count: number }[];
}

/** GET /api/presence, from our own Discord bot (server/discord.ts). Same shape Lanyard uses. */
export interface PresenceActivity {
  type: number;
  name: string;
  state?: string | undefined;
  details?: string | undefined;
}

export interface PresenceData {
  discord_user: { id: string; username: string; global_name: string | null; avatar: string | null };
  discord_status: 'online' | 'idle' | 'dnd' | 'offline';
  activities: PresenceActivity[];
}
