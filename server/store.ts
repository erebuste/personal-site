import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { defaultProfile } from '../src/config/profile.ts';
import { profileSchema, type ProfileConfig, type StatsResponse } from '../src/types/index.ts';

export const DATA_DIR = process.env.DATA_DIR ?? join(import.meta.dirname, '..', 'data');
export const UPLOAD_DIR = join(DATA_DIR, 'uploads');
const PROFILE_FILE = join(DATA_DIR, 'profile.json');
const VIEWS_FILE = join(DATA_DIR, 'views.json');

await mkdir(UPLOAD_DIR, { recursive: true });

async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (e) {
    if (e instanceof Error && 'code' in e && e.code === 'ENOENT') return undefined;
    throw e;
  }
}

// Writes are chained so two saves can't interleave on the same temp file;
// write-then-rename means a crash never leaves a truncated JSON file.
let writeQueue: Promise<unknown> = Promise.resolve();
function writeJson(file: string, value: unknown): Promise<void> {
  const run = writeQueue.then(async () => {
    await writeFile(`${file}.tmp`, JSON.stringify(value, null, 2));
    await rename(`${file}.tmp`, file);
  });
  writeQueue = run.catch(() => undefined);
  return run;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Stored values over defaults, so fields added in later versions get their default instead of failing validation. */
function withDefaults(defaults: unknown, stored: unknown): unknown {
  if (!isPlainObject(defaults) || !isPlainObject(stored)) return stored === undefined ? defaults : stored;
  const out: Record<string, unknown> = { ...defaults };
  for (const [k, v] of Object.entries(stored)) out[k] = withDefaults(defaults[k], v);
  return out;
}

// ---- profile ----

async function loadProfile(): Promise<ProfileConfig> {
  const raw = await readJson(PROFILE_FILE);
  if (raw === undefined) {
    await writeJson(PROFILE_FILE, defaultProfile);
    return defaultProfile;
  }
  const parsed = profileSchema.safeParse(withDefaults(defaultProfile, raw));
  if (parsed.success) return parsed.data;
  // The next admin save overwrites profile.json with whatever the dashboard shows (the defaults), so keep a copy.
  const backup = join(DATA_DIR, `profile.invalid-${Date.now()}.json`);
  await copyFile(PROFILE_FILE, backup);
  console.error(`data/profile.json failed validation; serving defaults, original kept at ${backup}.`, parsed.error.issues);
  return defaultProfile;
}

let profile = await loadProfile();

export const getProfile = (): ProfileConfig => profile;

export async function saveProfile(next: ProfileConfig): Promise<void> {
  await writeJson(PROFILE_FILE, next);
  profile = next;
  pruneUploads(next).catch((e: unknown) => console.error('Failed to prune uploads', e));
}

// Uploads happen before the save that uses them, so a file the profile doesn't mention yet may be sitting in an
// unsaved draft. Only files unreferenced for a day are deleted.
const UPLOAD_GRACE_MS = 86_400_000;

/** Deletes uploads the saved profile no longer references (replaced avatars, removed showcases, old tracks). */
async function pruneUploads(saved: ProfileConfig): Promise<void> {
  const json = JSON.stringify(saved);
  for (const entry of await readdir(UPLOAD_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || json.includes(`/uploads/${entry.name}`)) continue;
    const file = join(UPLOAD_DIR, entry.name);
    if (Date.now() - (await stat(file)).mtimeMs > UPLOAD_GRACE_MS) await rm(file);
  }
}

// ---- views ----

const viewsSchema = z.object({ total: z.number(), days: z.record(z.string(), z.number()) });
const views = viewsSchema.catch({ total: 0, days: {} }).parse(await readJson(VIEWS_FILE));

const today = () => new Date().toISOString().slice(0, 10);
const seen = new Set<string>();
let seenDay = today();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** One view per visitor (ip + user agent) per UTC day. */
export function countView(visitor: string): void {
  const day = today();
  // The user agent is attacker-controlled, so cap the set; worst case a visitor is counted twice that day.
  if (day !== seenDay || seen.size >= 100_000) {
    seen.clear();
    seenDay = day;
  }
  const key = createHash('sha256').update(visitor).digest('base64url');
  if (seen.has(key)) return;
  seen.add(key);
  views.total++;
  views.days[day] = (views.days[day] ?? 0) + 1;
  // One write per 5s at most instead of one per new visitor. ponytail: a crash loses up to 5s of views.
  saveTimer ??= setTimeout(() => {
    saveTimer = undefined;
    writeJson(VIEWS_FILE, views).catch((e: unknown) => console.error('Failed to save views', e));
  }, 5_000);
}

export function stats(): StatsResponse {
  const lastWeek = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 86_400_000).toISOString().slice(0, 10);
    return { date, count: views.days[date] ?? 0 };
  });
  return { total: views.total, lastWeek };
}
