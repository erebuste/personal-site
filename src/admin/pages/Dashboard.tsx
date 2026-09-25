import { useEffect, useState, type ReactNode } from 'react';
import { ExternalLink, Eye, Link2, MessageCircle, Palette, TrendingUp, UserRound } from 'lucide-react';
import type { StatsResponse } from '../../types';
import { api, errorMessage, useAdmin } from '../state';
import { Button, NavRow, PageHeader, Section } from '../ui';

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-adm-line bg-adm-panel p-4">
      <span className="grid size-8 place-items-center rounded-lg bg-adm-accent/15 text-adm-accent-soft">
        {icon}
      </span>
      <p className="mt-4 text-xs text-adm-muted">{label}</p>
      <p className="mt-1 truncate font-sans text-xl font-bold">{value}</p>
    </div>
  );
}

const weekday = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' });

function ViewsChart({ data }: { data: StatsResponse['lastWeek'] }) {
  const [W, H, L, R, T, B] = [560, 220, 28, 8, 10, 26];
  const max = Math.max(4, ...data.map((d) => d.count));
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(data.length - 1, 1);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const ticks = [...new Set(Array.from({ length: 5 }, (_, i) => Math.round((max * i) / 4)))];
  const line = data.map((d, i) => `${x(i)},${y(d.count)}`).join(' ');
  const area = `${x(0)},${y(0)} ${line} ${x(data.length - 1)},${y(0)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Views over the last 7 days">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-adm-line" strokeDasharray="3 4" />
          <text x={L - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-adm-dim text-[9px]">
            {t}
          </text>
        </g>
      ))}
      <polygon points={area} className="fill-adm-accent/12" />
      <polyline points={line} fill="none" className="stroke-adm-accent" strokeWidth={2} strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={d.date}>
          <circle cx={x(i)} cy={y(d.count)} r={3} className="fill-adm-bg stroke-adm-accent" strokeWidth={1.5}>
            <title>{`${d.date}: ${d.count} views`}</title>
          </circle>
          <text x={x(i)} y={H - 6} textAnchor="middle" className="fill-adm-dim text-[9px]">
            {weekday(d.date)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function DashboardPage() {
  const { saved, go, notify } = useAdmin();
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    api<StatsResponse>('/api/admin/stats').then(setStats, (e: unknown) => notify(errorMessage(e), 'error'));
  }, [notify]);

  const weekTotal = stats?.lastWeek.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hey, ${saved.user.username}`}
        description="Here's how your profile is doing."
        action={
          <Button tone="secondary" small onClick={() => open('/', '_blank', 'noopener')}>
            View profile <ExternalLink className="size-3.5" />
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Eye className="size-4" />} label="Total views" value={stats?.total ?? '…'} />
        <Stat icon={<TrendingUp className="size-4" />} label="This week" value={weekTotal ?? '…'} />
        <Stat icon={<Link2 className="size-4" />} label="Links" value={`${saved.links.length}/50`} />
        <Stat
          icon={<MessageCircle className="size-4" />}
          label="Discord"
          value={saved.discordPresence.userId ? 'Linked' : 'Not set'}
        />
      </div>

      <Section title="Views" description="Unique visitors per day, last 7 days">
        {stats ? <ViewsChart data={stats.lastWeek} /> : <div className="h-40" />}
      </Section>

      <Section title="Quick actions">
        <div className="grid gap-2.5 sm:grid-cols-3">
          <NavRow icon={<UserRound className="size-4" />} title="Edit profile" onClick={() => go('profile')} />
          <NavRow icon={<Palette className="size-4" />} title="Appearance" onClick={() => go('appearance')} />
          <NavRow icon={<Link2 className="size-4" />} title="Links" onClick={() => go('links')} />
        </div>
      </Section>
    </div>
  );
}
