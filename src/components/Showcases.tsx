import { ArrowUpRight } from 'lucide-react';
import { boxStyle } from '../lib/boxStyle';
import type { BoxConfig, Showcase, ThemeConfig } from '../types';
import { Media } from './Media';

interface Props {
  items: Showcase[];
  box: BoxConfig;
  theme: ThemeConfig;
}

/** Image cards in the same glass box as the profile card; linked ones open in a new tab. */
export function Showcases({ items, box, theme }: Props) {
  return (
    <section aria-label="Showcases" className="grid gap-3 p-3 text-left sm:grid-cols-2" style={boxStyle(box)}>
      {items.map((item, i) => {
        const body = (
          <>
            <Media src={item.image} className="aspect-video w-full rounded-lg bg-white/5 object-cover" />
            <div className="mt-2.5 flex items-start gap-2 px-1 pb-1">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color: theme.primaryText }}>
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: theme.secondaryText }}>
                    {item.description}
                  </p>
                )}
              </div>
              {item.href && <ArrowUpRight aria-hidden className="size-4 shrink-0" color={theme.accent} />}
            </div>
          </>
        );
        const card = 'block rounded-xl bg-white/[0.03] p-1.5 transition';
        return item.href ? (
          <a
            key={i}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${card} hover:-translate-y-0.5 hover:bg-white/[0.07] focus-visible:outline-2`}
            style={{ outlineColor: theme.accent }}
          >
            {body}
          </a>
        ) : (
          <div key={i} className={card}>
            {body}
          </div>
        );
      })}
    </section>
  );
}
