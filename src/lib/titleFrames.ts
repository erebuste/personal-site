import { useEffect, useState } from 'react';
import type { TitleAnimation } from '../types';

// Browser-tab title animations: each turns the title into a loop of frames, one shown per tick.
// Frames must never be empty — an empty document.title makes the tab show the URL instead.

const BLANK = '⠀'; // braille blank: renders empty but isn't trimmed away
const GLYPHS = '!<>-_\\/[]{}=+*^?#$%&@';
const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? '#';
const repeat = <T,>(value: T, times: number): T[] => Array<T>(times).fill(value);
/** A frame that's only spaces would show the URL, so swap it for the blank. */
const notBlank = (frame: string) => (frame.trim() ? frame : BLANK);

/** Toggle the case of one character, leaving the rest as written. */
const flipCase = (ch: string) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase());

const UPSIDE = [...'ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz'];
/** Reads upside down: reversed, each a-z letter swapped for its rotated look-alike (others kept). */
const upsideDown = (s: string) =>
  [...s]
    .reverse()
    .map((ch) => {
      const i = ch.toLowerCase().charCodeAt(0) - 97;
      return ch.length === 1 && i >= 0 && i < 26 ? (UPSIDE[i] ?? ch) : ch;
    })
    .join('');
/** The title prefixed by each symbol in turn. */
const cycle = (symbols: string, title: string) => [...symbols].map((c) => `${c} ${title}`);

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

  // Slides right and back, padded with blanks the tab won't trim.
  bounce: (title) => {
    const steps = [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
    return steps.map((n) => BLANK.repeat(n) + title);
  },

  dots: (title) => [title, `${title}.`, `${title}..`, `${title}...`],

  spinner: (title) => ['◐', '◓', '◑', '◒'].map((c) => `${c} ${title}`),

  // Lub-dub, then a pause.
  heartbeat: (title) => [`♥ ${title}`, `♡ ${title}`, `♥ ${title}`, ...repeat(`♡ ${title}`, 4)],

  // Grows out from the middle, holds, then shrinks back into it.
  reveal: (title) => {
    const chars = [...title];
    const n = chars.length;
    const grow = chars.map((_, i) => {
      const start = Math.floor((n - (i + 1)) / 2);
      return notBlank(chars.slice(start, start + i + 1).join(''));
    });
    return [...grow, ...repeat(title, 5), ...grow.slice(0, -1).reverse()];
  },

  // A loading bar fills up in front of the title.
  progress: (title) => Array.from({ length: 6 }, (_, i) => `${'▰'.repeat(i)}${'▱'.repeat(5 - i)} ${title}`),

  clock: (title) => cycle('🕛🕐🕑🕒🕓🕔🕕🕖🕗🕘🕙🕚', title),

  moon: (title) => cycle('🌑🌒🌓🌔🌕🌖🌗🌘', title),

  music: (title) => cycle('♪♫♬♫', title),

  // Flips over and back.
  'upside-down': (title) => [...repeat(title, 4), ...repeat(upsideDown(title), 4)],

  // Letters spread apart and snap back together.
  expand: (title) => {
    const chars = [...title];
    const spread = [1, 2].map((n) => chars.join(BLANK.repeat(n)));
    return [...repeat(title, 3), ...spread, spread[0] ?? title];
  },
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
