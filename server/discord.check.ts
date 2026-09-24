// Run: node server/discord.check.ts   (fake gateway + fake fetch; never talks to Discord)
import assert from 'node:assert/strict';

class FakeSocket {
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number; reason: string }) => void) | null = null;
  constructor() {
    sockets.push(this);
  }
  send() {}
  close() {}
}
const sockets: FakeSocket[] = [];
globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;

let calls = 0;
let status = 429;
globalThis.fetch = (async () => {
  calls++;
  await new Promise((r) => setTimeout(r, 10));
  return status === 200
    ? Response.json({ id: '1', username: 'u', global_name: null, avatar: null, email: 'x' })
    : new Response(null, { status });
}) as typeof fetch;

const { startPresenceBot } = await import('./discord.ts');
const getPresence = startPresenceBot('token');
const socket = sockets[0];
assert.ok(socket);
const dispatch = (p: object) => socket.onmessage?.({ data: JSON.stringify(p) });

// Malformed gateway messages are logged, not thrown (a throw would crash the API process).
dispatch({ op: 0, s: 1, t: 'GUILD_CREATE', d: {} });
socket.onmessage?.({ data: 'not json' });

// While Discord fails, concurrent and repeat requests share one call instead of one each.
assert.deepEqual(await Promise.all([getPresence('1'), getPresence('1'), getPresence('1')]), [null, null, null]);
await getPresence('1');
assert.equal(calls, 1);

// A new session (READY) forgets presences from the old one; only the user fields we use are kept.
dispatch({ op: 0, s: 2, t: 'PRESENCE_UPDATE', d: { user: { id: '1' }, status: 'online', activities: [] } });
dispatch({ op: 0, s: 3, t: 'READY', d: { user: { username: 'bot' } } });
const realNow = Date.now;
Date.now = () => realNow() + 61_000; // past the retry window
status = 200;
const presence = await getPresence('1');
Date.now = realNow;
assert.equal(presence?.discord_status, 'offline');
assert.ok(presence && !('email' in presence.discord_user));
assert.equal(calls, 2);

// Zombie connection: an unacked heartbeat reconnects without waiting for onclose, and a late onclose
// from the dead socket doesn't schedule a second connection.
dispatch({ op: 10, s: null, t: null, d: { heartbeat_interval: 5 } });
await new Promise((r) => setTimeout(r, 30));
socket.onclose?.({ code: 1006, reason: '' });
await new Promise((r) => setTimeout(r, 5_100)); // RECONNECT_MIN
assert.equal(sockets.length, 2);
dispatch({ op: 0, s: 4, t: 'PRESENCE_UPDATE', d: { user: { id: '1' }, status: 'online', activities: [] } });
assert.equal((await getPresence('1'))?.discord_status, 'offline'); // messages from the old socket are ignored

console.log('discord.check: ok');
