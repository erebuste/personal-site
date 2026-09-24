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
};
