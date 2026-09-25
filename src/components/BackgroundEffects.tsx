import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CURSOR_EFFECTS } from '../lib/cursorEffects';
import type { BackgroundConfig, CursorTrail, PageOverlay } from '../types';
import { Media } from './Media';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Overlays drawn as individual particles; index.css decides what each one looks like and how it moves. */
const PARTICLE_CLASSES: Partial<Record<PageOverlay, string>> = {
  sakura: 'sakura-petal',
  leaves: 'sakura-petal leaf',
  fireflies: 'firefly',
  embers: 'ember',
  hearts: 'heart',
  bubbles: 'bubble',
  matrix: 'matrix-drop',
  meteors: 'meteor',
  confetti: 'sakura-petal confetti',
  dust: 'firefly dust',
};

/** Randomised once per mount so every particle moves at its own pace. */
function Particles({ className, count }: { className: string; count: number }) {
  const [particles] = useState(() =>
    Array.from({ length: count }, () => ({
      left: `${rand(0, 100)}%`,
      '--top': `${rand(0, 100)}%`,
      '--size': `${rand(9, 16)}px`,
      '--fall': `${rand(9, 18)}s`,
      '--delay': `${-rand(0, 18)}s`, // negative: start mid-flight so the screen isn't empty at first
      '--sway': `${rand(20, 60)}px`,
      '--spin': `${rand(4, 9)}s`,
    })),
  );
  return particles.map((style, i) => <span key={i} className={className} style={style as CSSProperties} />);
}

/** Full-page overlay effect; `preview` pins it to the parent box instead of the viewport (admin preview). */
export function PageOverlayLayer({ type, preview = false }: { type: Exclude<PageOverlay, 'none'>; preview?: boolean }) {
  const particle = PARTICLE_CLASSES[type];
  return (
    <div aria-hidden className={`page-overlay overlay-${type} ${preview ? 'overlay-preview' : ''}`}>
      {particle && <Particles className={particle} count={preview ? 12 : 28} />}
    </div>
  );
}

interface CursorProps {
  type: Exclude<CursorTrail, 'none'>;
  color: string;
  emoji: string;
}

/** Full-screen canvas running one cursor trail. Mouse only; skipped on touch and reduced motion. */
export function CursorCanvas({ type, color, emoji }: CursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const resize = () => {
      const dpr = devicePixelRatio || 1;
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const effect = CURSOR_EFFECTS[type](color, emoji);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') effect.move(e.clientX, e.clientY);
    };

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      effect.frame(ctx);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    addEventListener('pointermove', onMove);
    addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onMove);
      removeEventListener('resize', resize);
    };
  }, [type, color, emoji]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-50 size-full" />;
}

interface Props {
  background: BackgroundConfig;
  overlay: PageOverlay;
  cursorTrail: CursorTrail;
  cursorEmoji: string;
  trailColor: string;
}

export function BackgroundEffects({ background: bg, overlay, cursorTrail, cursorEmoji, trailColor }: Props) {
  const mediaStyle = {
    objectFit: bg.size,
    opacity: bg.opacity / 100,
    filter: bg.blur ? `blur(${bg.blur}px)` : undefined,
    transform: bg.blur ? 'scale(1.06)' : undefined, // hide blurred edges
  };

  return (
    <>
      <div aria-hidden className="fixed inset-0 z-0 overflow-hidden" style={{ backgroundColor: bg.color }}>
        {bg.src && <Media src={bg.src} className="absolute inset-0 size-full" style={mediaStyle} />}
      </div>
      {overlay !== 'none' && <PageOverlayLayer type={overlay} />}
      {cursorTrail !== 'none' && <CursorCanvas type={cursorTrail} color={trailColor} emoji={cursorEmoji} />}
    </>
  );
}
