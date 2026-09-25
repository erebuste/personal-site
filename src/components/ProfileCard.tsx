import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Eye, MapPin } from 'lucide-react';
import { boxStyle, withAlpha } from '../lib/boxStyle';
import type { BoxConfig, ThemeConfig, UserProfile, UsernameEffect } from '../types';
import { Media } from './Media';

/** Types the text out, holds, deletes it, repeats. */
function useTypewriter(text: string, enabled: boolean): string {
  const [shown, setShown] = useState(text.length);
  useEffect(() => {
    if (!enabled) return;
    const n = text.length;
    const frames = [
      ...Array.from({ length: n + 1 }, (_, i) => i),
      ...Array<number>(12).fill(n),
      ...Array.from({ length: n }, (_, i) => n - 1 - i),
    ];
    let i = 0;
    const id = setInterval(() => setShown(frames[i++ % frames.length] ?? n), 140);
    return () => clearInterval(id);
  }, [text, enabled]);
  return enabled ? text.slice(0, shown) : text;
}

/** Username with one of the animated effects (CSS lives in index.css under `.fx-*`). */
export function Username({ text, effect, theme }: { text: string; effect: UsernameEffect; theme: ThemeConfig }) {
  const typed = useTypewriter(text, effect === 'typewriter');
  const vars = { '--fx-accent': theme.accent, '--fx-base': theme.primaryText } as CSSProperties;

  if (effect === 'wave' || effect === 'spin')
    return (
      <span className={`fx-${effect}`} style={vars}>
        {[...text].map((ch, i) => (
          <span key={i} style={{ '--i': i } as CSSProperties}>
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </span>
    );
  if (effect === 'typewriter') return <span className="fx-typewriter">{typed}</span>;
  return (
    <span className={effect === 'none' ? undefined : `fx-${effect}`} data-text={text} style={vars}>
      {text}
    </span>
  );
}

/** Effects with transparent glyphs (gradient fill or outline only); a text-shadow behind them looks muddy. */
const GRADIENT_EFFECTS: UsernameEffect[] = ['rainbow', 'shimmer', 'outline', 'gradient', 'gold', 'hologram'];

const SPARKLES = [
  { left: '-14%', top: '-10%', delay: '0s' },
  { left: '104%', top: '5%', delay: '0.6s' },
  { left: '38%', top: '78%', delay: '1.1s' },
  { left: '80%', top: '-35%', delay: '1.5s' },
] as const;

/** Plain text lines; a line containing only `[hr-theme]` becomes a theme-colored divider. */
export function Description({ text, theme }: { text: string; theme: ThemeConfig }) {
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line, i) =>
      line.trim() === '[hr-theme]' ? (
        <hr
          key={i}
          className="mt-6 h-px w-full border-0"
          style={{ background: `linear-gradient(90deg, transparent, ${withAlpha(theme.accent, 60)}, transparent)` }}
        />
      ) : (
        <p key={i} className="mt-3 text-sm leading-relaxed break-words" style={{ color: theme.secondaryText }}>
          {line}
        </p>
      ),
    );
}

interface Props {
  user: UserProfile;
  box: BoxConfig;
  theme: ThemeConfig;
  views?: number | undefined;
  children?: ReactNode;
}

export function ProfileCard({ user, box, theme, views, children }: Props) {
  return (
    <section className="relative flex flex-col items-center text-center" style={{ ...boxStyle(box), padding: box.padding }}>
      {user.bannerUrl && (
        // Bleeds to the card edges; the avatar overlaps its bottom half.
        <Media
          src={user.bannerUrl}
          className="h-[130px] max-w-none object-cover"
          style={{
            width: `calc(100% + ${box.padding * 2}px)`,
            margin: `-${box.padding}px -${box.padding}px -44px`,
            borderRadius: `${box.radius}px ${box.radius}px 0 0`,
          }}
        />
      )}
      <img
        src={user.avatarUrl}
        alt={user.username}
        width={88}
        height={88}
        className="relative size-22 object-cover select-none"
        style={{ borderRadius: user.avatarRadius }}
        draggable={false}
      />

      <h1
        className="relative mt-5 text-[22px] leading-none font-bold tracking-tight"
        style={{
          color: theme.primaryText,
          textShadow: GRADIENT_EFFECTS.includes(theme.usernameEffect) ? undefined : `0 0 14px ${withAlpha(theme.accent, 25)}`,
        }}
      >
        <Username text={user.username} effect={theme.usernameEffect} theme={theme} />
        {theme.sparkles.enabled &&
          SPARKLES.map((s) => (
            <span
              key={s.left}
              aria-hidden
              className="animate-twinkle pointer-events-none absolute text-[9px]"
              style={{ left: s.left, top: s.top, color: theme.sparkles.color, animationDelay: s.delay }}
            >
              ✦
            </span>
          ))}
      </h1>

      {user.location && (
        <p className="mt-3 flex items-center gap-1 text-xs" style={{ color: theme.secondaryText }}>
          <MapPin className="size-3" /> {user.location}
        </p>
      )}

      <Description text={user.description} theme={theme} />

      {children}

      {views !== undefined && (
        <span
          className="absolute bottom-3 left-4 flex items-center gap-1.5 text-[11px] tabular-nums"
          style={{ color: theme.secondaryText }}
          title="Profile views"
        >
          <Eye className="size-3.5" /> {views.toLocaleString()}
        </span>
      )}
    </section>
  );
}
