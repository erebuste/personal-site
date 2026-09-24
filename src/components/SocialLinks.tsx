import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import {
  siDiscord,
  siGithub,
  siInstagram,
  siSpotify,
  siSteam,
  siTelegram,
  siTiktok,
  siTwitch,
  siX,
  siYoutube,
  type SimpleIcon,
} from 'simple-icons';
import { withAlpha } from '../lib/boxStyle';
import type { Platform, SocialLink, ThemeConfig } from '../types';

// Record over the Platform union: adding a platform without an icon is a type error.
export const ICONS: Record<Exclude<Platform, 'website'>, SimpleIcon> = {
  steam: siSteam,
  youtube: siYoutube,
  discord: siDiscord,
  github: siGithub,
  x: siX,
  instagram: siInstagram,
  tiktok: siTiktok,
  spotify: siSpotify,
  twitch: siTwitch,
  telegram: siTelegram,
};

export function Icon({ platform, color, className = 'size-6.5' }: { platform: Platform; color: string; className?: string }) {
  if (platform === 'website') return <Globe className={className} color={color} />;
  return (
    <svg viewBox="0 0 24 24" className={className} fill={color} aria-hidden>
      <path d={ICONS[platform].path} />
    </svg>
  );
}

interface Props {
  links: SocialLink[];
  theme: ThemeConfig;
}

export function SocialLinks({ links, theme }: Props) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(id);
  }, [toast]);

  if (links.length === 0) return null;

  const copy = (value: string, title: string) =>
    navigator.clipboard.writeText(value).then(
      () => setToast(`Copied ${title}`),
      () => setToast('Copy failed'),
    );

  const itemClass = 'rounded-md p-0.5 transition-all duration-200 hover:scale-115 focus-visible:outline-2 outline-white/60';
  const itemStyle = theme.iconGlow ? { filter: `drop-shadow(0 0 6px ${withAlpha(theme.accent, 55)})` } : undefined;

  return (
    <>
      <nav aria-label="Social links" className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        {links.map(({ platform, title, action }) =>
          action.type === 'url' ? (
            <a
              key={title}
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              title={title}
              aria-label={title}
              className={itemClass}
              style={itemStyle}
            >
              <Icon platform={platform} color={theme.accent} />
            </a>
          ) : (
            <button
              key={title}
              type="button"
              onClick={() => void copy(action.value, title)}
              title={`Copy ${title}`}
              aria-label={`Copy ${title}`}
              className={`${itemClass} cursor-pointer`}
              style={itemStyle}
            >
              <Icon platform={platform} color={theme.accent} />
            </button>
          ),
        )}
      </nav>

      {toast && (
        <div
          role="status"
          className="animate-fade-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-white/10 bg-black/60 px-4 py-2 text-xs backdrop-blur-md"
        >
          {toast}
        </div>
      )}
    </>
  );
}
