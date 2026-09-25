import type { CursorTrail } from '../types';

// Canvas cursor trails. Each effect gets pointer positions via move() and draws itself every frame.

type Ctx = CanvasRenderingContext2D;
type Point = { x: number; y: number };

export interface CursorEffect {
  move(x: number, y: number): void;
  frame(ctx: Ctx): void;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

type Particle = Point & { vx: number; vy: number; life: number; size: number; decay: number };

/** Spawns a particle on every `every`-th pointer move; particles drift, fall by `gravity` and fade out. */
function particles(
  spawn: (x: number, y: number) => Particle,
  draw: (ctx: Ctx, p: Particle) => void,
  gravity: number,
  every = 1,
): CursorEffect {
  let list: Particle[] = [];
  let moves = 0;
  return {
    move(x, y) {
      if (moves++ % every) return;
      list.push(spawn(x, y));
      if (list.length > 200) list.shift();
    },
    frame(ctx) {
      list = list.filter((p) => (p.life -= p.decay) > 0);
      for (const p of list) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += gravity;
        ctx.globalAlpha = Math.min(1, p.life);
        draw(ctx, p);
      }
      ctx.globalAlpha = 1;
    },
  };
}

/** A tail of points, each easing toward the one ahead of it, so it collapses onto the cursor at rest. */
function chain(length: number, ease: number, draw: (ctx: Ctx, points: Point[], cursor: Point) => void): CursorEffect {
  const points: Point[] = Array.from({ length }, () => ({ x: 0, y: 0 }));
  let cursor: Point | null = null;
  return {
    move(x, y) {
      if (!cursor) for (const p of points) Object.assign(p, { x, y });
      cursor = { x, y };
    },
    frame(ctx) {
      if (!cursor) return;
      let ahead = cursor;
      for (const p of points) {
        p.x += (ahead.x - p.x) * ease;
        p.y += (ahead.y - p.y) * ease;
        ahead = p;
      }
      draw(ctx, points, cursor);
    },
  };
}

const glyph = (char: string, color: string) => (ctx: Ctx, p: Particle) => {
  ctx.font = `${p.size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(char, p.x, p.y);
};

const RAINBOW = ['#fe0000', '#fd8c00', '#ffe500', '#119f0b', '#0644b3', '#c22edc'];
const CONFETTI = ['#ff5f6d', '#ffc371', '#47e891', '#3fa7ff', '#b16cff', '#ffffff'];
const KATAKANA = [...'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ01'];
const NOTES = [...'♪♫♬♩'];
/** A stable per-particle choice, seeded by the fractional part of its random `size`. */
const pick = (list: string[], seed: number): string => list[Math.floor((seed % 1) * list.length)] ?? '#fff';

// Record over the union: adding a trail to the schema without implementing it is a type error.
export const CURSOR_EFFECTS: Record<Exclude<CursorTrail, 'none'>, (color: string, emoji: string) => CursorEffect> = {
  'fairy-dust': (color) =>
    particles(
      (x, y) => ({ x, y, vx: rand(-0.6, 0.6), vy: rand(0.2, 0.8), life: 1, size: rand(1.6, 2.8), decay: 0.018 }),
      (ctx, p) => {
        const s = 0.6 + p.life * p.size; // four-point sparkle
        ctx.fillStyle = color;
        ctx.fillRect(p.x - s, p.y - 0.5, s * 2, 1);
        ctx.fillRect(p.x - 0.5, p.y - s, 1, s * 2);
      },
      0.015,
    ),

  bubbles: (color) =>
    particles(
      (x, y) => ({ x, y, vx: rand(-0.3, 0.3), vy: rand(-1.2, -0.5), life: 1, size: rand(2, 7), decay: 0.012 }),
      (ctx, p) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(p.life * 12) * 2, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      },
      -0.004,
      3,
    ),

  snow: (color) =>
    particles(
      (x, y) => ({ x, y, vx: rand(-0.4, 0.4), vy: rand(0.6, 1.4), life: 1.2, size: rand(9, 16), decay: 0.01 }),
      glyph('❄', color),
      0,
      3,
    ),

  emoji: (_color, emoji) =>
    particles(
      (x, y) => ({ x, y, vx: rand(-1, 1), vy: rand(-2, -0.6), life: 1.2, size: rand(14, 22), decay: 0.015 }),
      glyph(emoji, '#fff'),
      0.08,
      3,
    ),

  rainbow: () =>
    chain(24, 0.45, (ctx, points) => {
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      RAINBOW.forEach((c, band) => {
        const offset = (band - (RAINBOW.length - 1) / 2) * 3;
        ctx.strokeStyle = c;
        ctx.beginPath();
        points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + offset) : ctx.moveTo(p.x, p.y + offset)));
        ctx.stroke();
      });
    }),

  ghost: (color) =>
    chain(14, 0.4, (ctx, points) => {
      ctx.fillStyle = color;
      points.forEach((p, i) => {
        const t = 1 - i / points.length;
        ctx.globalAlpha = t * 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1 + 5 * t, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }),

  follow: (color) =>
    chain(1, 0.18, (ctx, points, cursor) => {
      const ring = points[0] ?? cursor;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }),

  hearts: (color) =>
    particles(
      (x, y) => ({ x, y, vx: rand(-0.5, 0.5), vy: rand(-1.4, -0.6), life: 1, size: rand(10, 16), decay: 0.016 }),
      glyph('♥', color),
      -0.01,
      3,
    ),

  stars: (color) =>
    particles(
      (x, y) => ({ x, y, vx: rand(-1, 1), vy: rand(-1, 0.5), life: 1, size: rand(8, 14), decay: 0.02 }),
      glyph('★', color),
      0.05,
      2,
    ),

  // Hot white-yellow at birth, cooling to orange then red as it rises and shrinks.
  fire: () =>
    particles(
      (x, y) => ({ x: x + rand(-3, 3), y, vx: rand(-0.4, 0.4), vy: rand(-1.8, -0.8), life: 1, size: rand(3, 6), decay: 0.03 }),
      (ctx, p) => {
        ctx.fillStyle = p.life > 0.6 ? '#ffe08a' : p.life > 0.3 ? '#ff8a1d' : '#d6361b';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life + 0.5, 0, Math.PI * 2);
        ctx.fill();
      },
      -0.02,
    ),

  // A tapering streak that thins and fades toward its tail.
  comet: (color) =>
    chain(18, 0.5, (ctx, points, cursor) => {
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      let prev = cursor;
      points.forEach((p, i) => {
        const t = 1 - i / points.length;
        ctx.globalAlpha = t;
        ctx.lineWidth = 0.5 + 6 * t;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        prev = p;
      });
      ctx.globalAlpha = 1;
    }),

  // Falling green glyphs, the newest one bright.
  matrix: () =>
    particles(
      (x, y) => ({ x, y, vx: 0, vy: rand(0.8, 2), life: 1, size: rand(10, 15), decay: 0.02 }),
      (ctx, p) => {
        ctx.font = `${Math.floor(p.size)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = p.life > 0.85 ? '#d9ffe0' : '#3dff7a';
        ctx.fillText(pick(KATAKANA, p.size), p.x, p.y);
      },
      0.02,
      2,
    ),

  // Rings spreading out from where the pointer passed.
  ripple: (color) =>
    particles(
      (x, y) => ({ x, y, vx: 0, vy: 0, life: 1, size: rand(18, 30), decay: 0.025 }),
      (ctx, p) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (1 - p.life) * p.size + 2, 0, Math.PI * 2);
        ctx.stroke();
      },
      0,
      6,
    ),

  // Tumbling paper strips thrown up and falling back down.
  confetti: () =>
    particles(
      (x, y) => ({ x, y, vx: rand(-2, 2), vy: rand(-3, -1), life: 1.3, size: rand(0, 1), decay: 0.015 }),
      (ctx, p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 8 + p.size * 6);
        ctx.fillStyle = pick(CONFETTI, p.size);
        ctx.fillRect(-3, -1.5, 6, 3);
        ctx.restore();
      },
      0.09,
      2,
    ),

  // A glowing tube of light following the pointer.
  neon: (color) =>
    chain(16, 0.5, (ctx, points, cursor) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(cursor.x, cursor.y);
      for (const p of points) ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }),

  // Three dots circling a point that eases after the pointer.
  orbit: (color) =>
    chain(1, 0.25, (ctx, points, cursor) => {
      const center = points[0] ?? cursor;
      const t = performance.now() / 350;
      ctx.fillStyle = color;
      for (let i = 0; i < 3; i++) {
        const a = t + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(center.x + Math.cos(a) * 14, center.y + Math.sin(a) * 14, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }),

  // Sakura petals tumbling down and swaying.
  petals: () =>
    particles(
      (x, y) => ({ x, y, vx: rand(-0.8, 0.8), vy: rand(0.2, 0.8), life: 1.2, size: rand(0, 1), decay: 0.012 }),
      (ctx, p) => {
        ctx.save();
        ctx.translate(p.x + Math.sin(p.life * 6) * 6, p.y);
        ctx.rotate(p.life * 4 + p.size * 6);
        ctx.fillStyle = p.size > 0.5 ? '#ffb7c9' : '#ffd6e0';
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
      0.01,
      3,
    ),

  // Chunky 8-bit pixels snapped to a grid, dropping away.
  pixels: (color) =>
    particles(
      (x, y) => ({ x: Math.round(x / 6) * 6, y: Math.round(y / 6) * 6, vx: 0, vy: rand(0.2, 1), life: 1, size: 6, decay: 0.03 }),
      (ctx, p) => {
        ctx.fillStyle = color;
        ctx.fillRect(p.x - p.size / 2, Math.round(p.y / 6) * 6 - p.size / 2, p.size, p.size);
      },
      0.03,
      2,
    ),

  // Soft grey puffs that rise and spread out.
  smoke: () =>
    particles(
      (x, y) => ({ x, y, vx: rand(-0.3, 0.3), vy: rand(-0.8, -0.3), life: 1, size: rand(4, 8), decay: 0.012 }),
      (ctx, p) => {
        ctx.globalAlpha *= 0.25;
        ctx.fillStyle = '#c8c8d0';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + (1 - p.life) * 16, 0, Math.PI * 2);
        ctx.fill();
      },
      -0.005,
      2,
    ),

  // Sparks thrown out and falling, drawn as short streaks along their motion.
  sparks: (color) =>
    particles(
      (x, y) => ({ x, y, vx: rand(-3, 3), vy: rand(-3, 1), life: 1, size: 0, decay: 0.035 }),
      (ctx, p) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
        ctx.stroke();
      },
      0.15,
    ),

  notes: (color) =>
    particles(
      (x, y) => ({ x, y, vx: rand(-0.6, 0.6), vy: rand(-1.4, -0.6), life: 1, size: rand(12, 18), decay: 0.015 }),
      (ctx, p) => glyph(pick(NOTES, p.size), color)(ctx, p),
      -0.01,
      3,
    ),
};
