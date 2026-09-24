// Self-hosted Lanyard: a bot on the Discord gateway that remembers presences it sees.
// Needs the privileged "Presence Intent" enabled for the bot, and a server shared with the user.
import type { PresenceActivity, PresenceData } from '../src/types/index.ts';

const GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json';
const API = 'https://discord.com/api/v10';
const INTENTS = (1 << 0) | (1 << 8); // GUILDS | GUILD_PRESENCES
const FATAL_CLOSE = new Set([4004, 4010, 4011, 4012, 4013, 4014]); // bad token / intents: retrying won't help
const USER_TTL = 10 * 60_000;

type Status = PresenceData['discord_status'];
type DiscordUser = PresenceData['discord_user'];
interface RawPresence {
  user: { id: string };
  status: Status;
  activities?: PresenceActivity[];
}
interface Payload {
  op: number;
  d: unknown;
  s: number | null;
  t: string | null;
}

// ponytail: keeps every presence the bot sees; fine for a personal server, key by the one user ID if it gets big.
const presences = new Map<string, { status: Status; activities: PresenceActivity[] }>();
const users = new Map<string, { at: number; user: DiscordUser | null }>();

const remember = (p: RawPresence) =>
  presences.set(p.user.id, {
    status: p.status,
    activities: (p.activities ?? []).map(({ type, name, state, details }) => ({ type, name, state, details })),
  });

export function startPresenceBot(token: string) {
  let seq: number | null = null;

  const connect = () => {
    const ws = new WebSocket(GATEWAY);
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let acked = true;
    const send = (op: number, d: unknown) => ws.send(JSON.stringify({ op, d }));

    ws.onmessage = (e: MessageEvent<string>) => {
      const { op, d, s, t } = JSON.parse(e.data) as Payload;
      if (s !== null) seq = s;

      if (op === 10) {
        // Hello: heartbeat on Discord's interval; an unanswered beat means a zombie connection, so reconnect.
        heartbeat = setInterval(() => {
          if (!acked) return ws.close(4000);
          acked = false;
          send(1, seq);
        }, (d as { heartbeat_interval: number }).heartbeat_interval);
        send(2, { token, intents: INTENTS, properties: { os: 'linux', browser: 'personal-site', device: 'personal-site' } });
      } else if (op === 11) acked = true;
      else if (op === 1) send(1, seq);
      else if (op === 7 || op === 9) ws.close(4000); // server asked for reconnect / session invalid
      else if (t === 'READY') console.log(`Discord presence bot connected as ${(d as { user: DiscordUser }).user.username}`);
      else if (t === 'GUILD_CREATE') (d as { presences: RawPresence[] }).presences.forEach(remember);
      else if (t === 'PRESENCE_UPDATE') remember(d as RawPresence);
    };

    // ponytail: always a fresh IDENTIFY instead of RESUME; fine at a handful of reconnects a day (limit is 1000).
    ws.onclose = (e) => {
      clearInterval(heartbeat);
      if (FATAL_CLOSE.has(e.code)) return console.error(`Discord presence bot stopped: ${e.code} ${e.reason}`);
      setTimeout(connect, 5000);
    };
  };

  connect();

  const build = (user: DiscordUser): PresenceData => {
    const p = presences.get(user.id);
    // Offline members never appear in presence events, so "not seen" means offline.
    return { discord_user: user, discord_status: p?.status ?? 'offline', activities: p?.activities ?? [] };
  };

  /** Presence for one user, or null if Discord doesn't know the ID. */
  return async function getPresence(userId: string): Promise<PresenceData | null> {
    const cached = users.get(userId);
    if (cached && Date.now() - cached.at < USER_TTL) return cached.user && build(cached.user);

    const res = await fetch(`${API}/users/${userId}`, { headers: { Authorization: `Bot ${token}` } }).catch(() => null);
    // Network error or Discord hiccup: serve the last known user rather than caching a miss.
    if (!res || (!res.ok && res.status !== 404)) return cached?.user ? build(cached.user) : null;

    const body = res.ok ? ((await res.json()) as DiscordUser) : null;
    const user = body && { id: body.id, username: body.username, global_name: body.global_name, avatar: body.avatar };
    users.set(userId, { at: Date.now(), user });
    return user && build(user);
  };
}
