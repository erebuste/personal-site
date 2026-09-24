import { useEffect, useState } from 'react';
import { boxStyle } from '../lib/boxStyle';
import type { BoxConfig, PresenceData, ThemeConfig } from '../types';

const STATUS: Record<PresenceData['discord_status'], { label: string; color: string }> = {
  online: { label: 'Online', color: '#23a55a' },
  idle: { label: 'Idle', color: '#f0b232' },
  dnd: { label: 'Do Not Disturb', color: '#f23f43' },
  offline: { label: 'Offline', color: '#80848e' },
};
const VERBS = ['Playing', 'Streaming', 'Listening to', 'Watching', '', 'Competing in'];
const CUSTOM_STATUS = 4;

function activityLine(d: PresenceData): string {
  const activity = d.activities.find((a) => a.type !== CUSTOM_STATUS);
  if (activity) return `${VERBS[activity.type] ?? 'Playing'} ${activity.name}${activity.details ? ` — ${activity.details}` : ''}`;
  return d.activities.find((a) => a.type === CUSTOM_STATUS)?.state ?? STATUS[d.discord_status].label;
}

interface Props {
  box: BoxConfig;
  theme: ThemeConfig;
}

/** Live Discord status from our own bot (GET /api/presence). Renders nothing until there's data. */
export function DiscordPresence({ box, theme }: Props) {
  const [data, setData] = useState<PresenceData | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const load = () =>
      fetch('/api/presence', { signal: ctrl.signal })
        .then((r) => (r.ok ? (r.json() as Promise<PresenceData>) : null))
        .then(setData)
        .catch(() => undefined); // aborted or offline: keep what we had
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, []);

  if (!data) return null;

  const user = data.discord_user;
  const avatar = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  return (
    <section className="flex items-center gap-4 p-2.5 text-left" style={boxStyle(box)} aria-live="polite">
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
          {user.global_name ?? user.username}
        </p>
        <p className="mt-1 truncate text-xs" style={{ color: theme.secondaryText }}>
          {activityLine(data)}
        </p>
      </div>
    </section>
  );
}
