// Run: node src/lib/titleFrames.check.ts
import assert from 'node:assert/strict';
import { TITLE_FRAMES } from './titleFrames.ts';

assert.deepEqual(TITLE_FRAMES.typing('abc'), ['a', 'ab', 'abc', 'abc', 'abc', 'abc', 'ab']);
assert.deepEqual(TITLE_FRAMES.scroll('ab').slice(0, 2), ['ab • ', 'b • a']);
assert.deepEqual(TITLE_FRAMES.wave('ab'), ['Ab', 'aB']);
assert.equal(TITLE_FRAMES.decrypt('abc').at(-1), 'abc');
assert.deepEqual(TITLE_FRAMES.typing('🔥x'), ['🔥', '🔥x', '🔥x', '🔥x', '🔥x']); // emoji not split

// Every animation, every frame: never empty (an empty title shows the URL instead).
for (const [name, make] of Object.entries(TITLE_FRAMES)) {
  for (const title of ['t', 'tagged', 'my site 🔥']) {
    const frames = make(title);
    assert.ok(frames.length > 0, `${name}: no frames`);
    for (const f of frames) assert.ok(f.trim().length > 0, `${name}(${title}): empty frame`);
  }
}
for (const f of TITLE_FRAMES.glitch('tagged')) assert.equal([...f].length, 6);
assert.deepEqual(TITLE_FRAMES.dots('ab'), ['ab', 'ab.', 'ab..', 'ab...']);
assert.deepEqual(TITLE_FRAMES.reveal('abc').slice(0, 3), ['b', 'ab', 'abc']);
assert.equal(TITLE_FRAMES.reveal('a b')[0], '⠀'); // middle char is a space: blank, not an empty-looking title
assert.ok(TITLE_FRAMES.bounce('ab').every((f) => f.endsWith('ab')));
assert.deepEqual([TITLE_FRAMES.progress('ab')[0], TITLE_FRAMES.progress('ab').at(-1)], ['▱▱▱▱▱ ab', '▰▰▰▰▰ ab']);
assert.equal(TITLE_FRAMES['upside-down']('Hi!').at(-1), '!ᴉɥ');
assert.ok(TITLE_FRAMES.expand('ab').includes('a⠀b'));
assert.equal(TITLE_FRAMES.clock('ab').length, 12);

console.log('titleFrames: all checks passed');
