import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { boxStyle } from '../lib/boxStyle';
import type { BoxConfig, LanyardData, ThemeConfig } from '../types';

const STATUS: Record<LanyardData['discord_status'], { label: string; color: string }> = {
  online: { label: 'Online', color: '#23a55a' },
  idle: { label: 'Idle', color: '#f0b232' },
  dnd: { label: 'Do Not Disturb', color: '#f23f43' },
  offline: { label: 'Offline', color: '#80848e' },
};
const VERBS = ['Playing', 'Streaming', 'Listening to', 'Watching', '', 'Competing in'];
const CUSTOM_STATUS = 4;

const isLanyard = (v: unknown): v is { success: true; data: LanyardData } =>
  typeof v === 'object' && v !== null && 'success' in v && v.success === true && 'data' in v;

function activityLine(d: LanyardData): string {
  const activity = d.activities.find((a) => a.type !== CUSTOM_STATUS);
  if (activity) return `${VERBS[activity.type] ?? 'Playing'} ${activity.name}${activity.details ? ` — ${activity.details}` : ''}`;
  return d.activities.find((a) => a.type === CUSTOM_STATUS)?.state ?? STATUS[d.discord_status].label;
}

interface Props {
  userId: string;
  box: BoxConfig;
  theme: ThemeConfig;
}

export function DiscordPresence({ userId, box, theme }: Props) {
  // undefined = loading, null = not found / not on Lanyard
  const [data, setData] = useState<LanyardData | null | undefined>(userId ? undefined : null);

  useEffect(() => {
    if (!userId) return;
    const ctrl = new AbortController();
    const load = () =>
      fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(userId)}`, { signal: ctrl.signal })
        .then((r) => r.json() as Promise<unknown>)
        .then((body) => setData(isLanyard(body) ? body.data : null))
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          console.warn('Lanyard fetch failed', e);
          setData(null);
        });
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [userId]);

  const user = data?.discord_user;
  const avatar = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  return (
    <section className="flex items-center gap-4 p-2.5 text-left" style={boxStyle(box)} aria-live="polite">
      {data ? (
        <>
          <div className="relative shrink-0">
            <img src={avatar} alt="" width={64} height={64} className="size-16 rounded-full" />
            <span
              className="absolute right-0.5 bottom-0.5 size-4 rounded-full border-3 border-[#141417]"
              style={{ backgroundColor: STATUS[data.discord_status].color }}
              title={STATUS[data.discord_status].label}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold" style={{ color: theme.primaryText }}>
              {data.discord_user.global_name ?? data.discord_user.username}
            </p>
            <p className="mt-1 truncate text-xs" style={{ color: theme.secondaryText }}>
              {activityLine(data)}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="grid size-16 shrink-0 place-items-center rounded-full bg-white/8">
            <X className="size-7" strokeWidth={3} color={theme.primaryText} />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold" style={{ color: theme.primaryText }}>
              {data === undefined ? 'Connecting…' : 'User Not Found'}
            </p>
            <p className="mt-1 text-xs" style={{ color: theme.secondaryText }}>
              Join{' '}
              <a
                href="https://discord.gg/lanyard"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
                style={{ color: theme.primaryText }}
              >
                discord.gg/lanyard
              </a>{' '}
              to display your discord presence!
            </p>
          </div>
        </>
      )}
    </section>
  );
}
