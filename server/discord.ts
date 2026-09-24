// Self-hosted Lanyard: a bot on the Discord gateway that remembers presences it sees.
// Needs the privileged "Presence Intent" enabled for the bot, and a server shared with the user.
import type { PresenceActivity, PresenceData } from '../src/types/index.ts';

const GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json';
const API = 'https://discord.com/api/v10';
const INTENTS = (1 << 0) | (1 << 8); // GUILDS | GUILD_PRESENCES
const FATAL_CLOSE = new Set([4004, 4010, 4011, 4012, 4013, 4014]); // bad token / intents: retrying won't help
// Discord resets the token after 1000 IDENTIFYs a day, so reconnects back off up to 10 minutes.
const RECONNECT_MIN = 5_000;
const RECONNECT_MAX = 10 * 60_000;
const USER_TTL = 10 * 60_000;
// After a failed user lookup, serve the last known user and retry in a minute. Without this every
// visitor request would hit Discord, and repeated 401/429s get the server's IP banned from the API.
const RETRY_MS = 60_000;

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
/** One entry per looked-up ID; `user` is shared by concurrent callers while a lookup is in flight. */
const users = new Map<string, { until: number; user: Promise<DiscordUser | null> }>();

const remember = (p: RawPresence) =>
  presences.set(p.user.id, {
    status: p.status,
    activities: (p.activities ?? []).map(({ type, name, state, details }) => ({ type, name, state, details })),
  });

/** The user, null if Discord says the ID doesn't exist; throws on network errors and other failures. */
async function fetchUser(token: string, userId: string): Promise<DiscordUser | null> {
  const res = await fetch(`${API}/users/${userId}`, {
    headers: { Authorization: `Bot ${token}` },
    signal: AbortSignal.timeout(5_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { id, username, global_name, avatar } = (await res.json()) as DiscordUser;
  return { id, username, global_name, avatar };
}

export function startPresenceBot(token: string) {
  let seq: number | null = null;
  let delay = RECONNECT_MIN;

  const connect = () => {
    const ws = new WebSocket(GATEWAY);
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let acked = true;
    let done = false; // this socket is finished; a new one is (or will be) connecting
    const send = (op: number, d: unknown) => ws.send(JSON.stringify({ op, d }));
    const reconnect = () => {
      if (done) return;
      done = true;
      clearInterval(heartbeat);
      setTimeout(connect, delay);
      delay = Math.min(delay * 2, RECONNECT_MAX);
    };

    const handle = ({ op, d, s, t }: Payload) => {
      if (s !== null) seq = s;

      if (op === 10) {
        // Hello: heartbeat on Discord's interval; an unanswered beat means a zombie connection. Reconnect right
        // away: a dead TCP connection may never finish the close handshake, so onclose could be a long time coming.
        heartbeat = setInterval(() => {
          if (!acked) {
            ws.close(4000);
            return reconnect();
          }
          acked = false;
          send(1, seq);
        }, (d as { heartbeat_interval: number }).heartbeat_interval);
        send(2, { token, intents: INTENTS, properties: { os: 'linux', browser: 'personal-site', device: 'personal-site' } });
      } else if (op === 11) acked = true;
      else if (op === 1) send(1, seq);
      else if (op === 7 || op === 9) ws.close(4000); // server asked for reconnect / session invalid
      else if (t === 'READY') {
        // Fresh session: forget presences from the old one, or anyone who went offline meanwhile stays "online".
        presences.clear();
        delay = RECONNECT_MIN;
        console.log(`Discord presence bot connected as ${(d as { user: DiscordUser }).user.username}`);
      } else if (t === 'GUILD_CREATE') ((d as { presences?: RawPresence[] }).presences ?? []).forEach(remember);
      else if (t === 'PRESENCE_UPDATE') remember(d as RawPresence);
    };

    // In Node, a throw inside a WebSocket listener is an uncaught exception and would take the whole API down.
    ws.onmessage = (e: MessageEvent<string>) => {
      if (done) return; // late message from a socket we've already replaced
      try {
        handle(JSON.parse(e.data) as Payload);
      } catch (err) {
        console.error('Discord gateway: bad message', err);
      }
    };

    // ponytail: always a fresh IDENTIFY instead of RESUME; fine at a handful of reconnects a day (limit is 1000).
    ws.onclose = (e) => {
      if (done) return;
      if (FATAL_CLOSE.has(e.code)) {
        done = true;
        clearInterval(heartbeat);
        return console.error(`Discord presence bot stopped: ${e.code} ${e.reason}`);
      }
      reconnect();
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
    let entry = users.get(userId);
    if (!entry || Date.now() > entry.until) {
      const stale = entry?.user ?? Promise.resolve(null);
      const next = { until: Date.now() + RETRY_MS, user: stale };
      next.user = fetchUser(token, userId).then(
        (user) => {
          next.until = Date.now() + USER_TTL;
          return user;
        },
        (err: unknown) => {
          console.warn(`Discord user lookup failed, retrying in a minute: ${err instanceof Error ? err.message : String(err)}`);
          return stale;
        },
      );
      users.set(userId, next);
      entry = next;
    }
    const user = await entry.user;
    return user && build(user);
  };
}
