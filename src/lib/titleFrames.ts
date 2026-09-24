import { useEffect, useState } from 'react';
import type { TitleAnimation } from '../types';

// Browser-tab title animations: each turns the title into a loop of frames, one shown per tick.
// Frames must never be empty — an empty document.title makes the tab show the URL instead.

const BLANK = '⠀'; // braille blank: renders empty but isn't trimmed away
const GLYPHS = '!<>-_\\/[]{}=+*^?#$%&@';
const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? '#';
const repeat = <T,>(value: T, times: number): T[] => Array<T>(times).fill(value);

/** Toggle the case of one character, leaving the rest as written. */
const flipCase = (ch: string) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase());

export const TITLE_FRAMES: Record<Exclude<TitleAnimation, 'none'>, (title: string) => string[]> = {
  // "t" → "tagged" (hold) → "t"
  typing: (title) => {
    const chars = [...title]; // code points, so emoji aren't split in half
    const up = chars.map((_, i) => chars.slice(0, i + 1).join(''));
    return [...up, ...repeat(title, 3), ...up.slice(1, -1).reverse()];
  },

  // Marquee: "tagged • " rotating left.
  scroll: (title) => {
    const chars = [...`${title} • `];
    return chars.map((_, i) => [...chars.slice(i), ...chars.slice(0, i)].join(''));
  },

  blink: (title) => [title, title, BLANK],

  // One letter at a time flips case, travelling left to right.
  wave: (title) => {
    const chars = [...title];
    return chars.map((_, i) => chars.map((ch, j) => (j === i ? flipCase(ch) : ch)).join(''));
  },

  // Mostly clean, with bursts of corrupted characters.
  glitch: (title) => {
    const chars = [...title];
    const corrupt = () => chars.map((ch) => (ch !== ' ' && Math.random() < 0.35 ? glyph() : ch)).join('');
    return [...repeat(title, 6), corrupt(), corrupt(), title, corrupt(), ...repeat(title, 4)];
  },

  // Random symbols resolve into the title left to right, then hold.
  decrypt: (title) => {
    const chars = [...title];
    const steps = chars.map((_, i) =>
      chars.map((ch, j) => (j <= i || ch === ' ' ? ch : glyph())).join(''),
    );
    return [chars.map(glyph).join(''), ...steps, ...repeat(title, 8)];
  },

  sparkle: (title) => [`✦ ${title} ✦`, `✧ ${title} ✧`, `⋆ ${title} ⋆`, `✧ ${title} ✧`],
};

/** The current frame of the chosen animation (or the plain title for 'none'). */
export function useTitleAnimation(title: string, type: TitleAnimation, speedMs: number): string {
  const [frame, setFrame] = useState(title);
  useEffect(() => {
    if (type === 'none') return;
    const frames = TITLE_FRAMES[type](title);
    setFrame(frames[0] ?? title); // don't leave the previous animation's frame up for a tick
    let i = 1;
    const id = setInterval(() => setFrame(frames[i++ % frames.length] ?? title), speedMs);
    return () => clearInterval(id);
  }, [title, type, speedMs]);
  return type === 'none' ? title : frame;
}
