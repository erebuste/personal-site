import { useRef } from 'react';
import { ArrowUpRight, LayoutGrid, X } from 'lucide-react';
import { boxStyle, withAlpha } from '../lib/boxStyle';
import type { BoxConfig, Showcase, ThemeConfig } from '../types';
import { Media } from './Media';

interface Props {
  items: Showcase[];
  box: BoxConfig;
  theme: ThemeConfig;
}

function Card({ item, theme }: { item: Showcase; theme: ThemeConfig }) {
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
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${card} hover:-translate-y-0.5 hover:bg-white/[0.07] focus-visible:outline-2`}
      style={{ outlineColor: theme.accent }}
    >
      {body}
    </a>
  ) : (
    <div className={card}>{body}</div>
  );
}

/** Button on the profile card that opens the showcase cards in a modal (native <dialog>: Esc, focus trap, top layer). */
export function Showcases({ items, box, theme }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition hover:scale-105 focus-visible:outline-2"
        style={{
          color: theme.primaryText,
          borderColor: withAlpha(theme.accent, 45),
          backgroundColor: withAlpha(theme.accent, 12),
          outlineColor: theme.accent,
        }}
      >
        <LayoutGrid className="size-3.5" color={theme.accent} />
        Showcases
        <span style={{ color: theme.secondaryText }}>{items.length}</span>
      </button>

      <dialog
        ref={dialog}
        aria-label="Showcases"
        // Clicks on the dialog element itself (not its contents) land on the backdrop area. Padding lives on the
        // inner div, otherwise clicking the card's own padding would count as the dialog and close it.
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="showcase-dialog m-auto max-h-[85dvh] overflow-y-auto p-0 text-left backdrop:bg-black/60 backdrop:backdrop-blur-sm"
        style={{ ...boxStyle(box), width: 'calc(100% - 2rem)', maxWidth: 760 }}
      >
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-base font-semibold" style={{ color: theme.primaryText }}>
              Showcases
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => dialog.current?.close()}
              className="cursor-pointer rounded-md p-1 transition hover:bg-white/10"
            >
              <X className="size-4" color={theme.secondaryText} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item, i) => (
              <Card key={i} item={item} theme={theme} />
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}
