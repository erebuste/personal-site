// Run: node server/og.check.ts   (renders into memory only; profile data goes to a throwaway temp dir)
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dataDir = mkdtempSync(join(tmpdir(), 'og-check-'));
process.env.DATA_DIR = dataDir; // store.ts reads this on import
const { ogImage, ogVersion } = await import('./og.ts');
const { defaultProfile } = await import('../src/config/profile.ts');

const size = (png: Buffer) => [png.readUInt32BE(16), png.readUInt32BE(20)]; // IHDR width, height
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

try {
  const base = structuredClone(defaultProfile);

  // Version tracks what's drawn on the card, not unrelated settings.
  const renamed = structuredClone(base);
  renamed.user.username = 'someone else';
  const retitled = structuredClone(base);
  retitled.embed.title = 'different tab title';
  assert.notEqual(ogVersion(renamed), ogVersion(base));
  assert.equal(ogVersion(retitled), ogVersion(base));

  // Renders a 1200×630 PNG, with a long bio (clamped), a missing avatar (letter fallback) and a
  // path trying to escape dist/ (ignored rather than read).
  const tricky = structuredClone(base);
  tricky.user.description = 'A very long bio line that keeps going and going. '.repeat(12) + '\n[hr-theme]\nmore';
  tricky.user.avatarUrl = '/uploads/does-not-exist.png';
  tricky.background.src = '/../../../../etc/passwd';
  for (const profile of [base, tricky]) {
    const png = await ogImage(profile);
    assert.ok(png.subarray(0, 4).equals(PNG_SIG), 'not a PNG');
    assert.deepEqual(size(png), [1200, 630]);
  }

  // Same version → the cached render, not a new one.
  assert.equal(ogImage(tricky), ogImage(structuredClone(tricky)));
  console.log('og: all checks passed');
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}
