// Live mode's pure parts: the state words, the cues, and the hold counter that forgives a splash.
const assert = require('assert');
const { liveState, liveCue, HoldCounter, LIVE_WORDS } = require('../js/live.js');
assert.strictEqual(liveState(null, false), 'none'); assert.strictEqual(liveState(null, true), 'hidden');
assert.strictEqual(liveState({ torsoAngle: 10 }, true), 'flat'); assert.strictEqual(liveState({ torsoAngle: 25 }, true), 'low');
assert.strictEqual(liveState({ torsoAngle: 45 }, true), 'sinking'); assert.strictEqual(liveState({ torsoAngle: 80 }, true), 'upright');
for (const s of ['none', 'hidden', 'flat', 'low', 'sinking', 'upright']) assert.ok(liveCue(s).length > 8 && LIVE_WORDS[s], 'cue and word for ' + s);
let h = new HoldCounter('float', 2); let t = 0; for (let i = 0; i < 50; i++) h.push(true, t += 0.25); assert.ok(Math.abs(h.held - 12.25) < 1e-9, 'held ' + h.held);
for (let i = 0; i < 4; i++) h.push(false, t += 0.25); assert.ok(h.held > 12, 'a one-second gap keeps the run');
for (let i = 0; i < 12; i++) h.push(false, t += 0.25); assert.strictEqual(h.held, 0, 'a three-second gap resets'); assert.ok(h.longest > 13, 'longest kept: ' + h.longest);
console.log('live.test.js: all checks passed');
