// A lap packed into a link must come back with the same score, parts, tips and a usable angle line, and be URL-safe.
const assert = require('assert');
const { packLap, unpackLap } = require('../js/share.js');
const fps = 8, n = 160;
const perFrame = Array.from({ length: n }, (_, i) => (i % 7 === 0 ? null : { torsoAngle: 10 + (i % 20) })), times = Array.from({ length: n }, (_, i) => i / fps), moving = perFrame.map((m, i) => !!m && i > 10);
const run = { summary: { readableFrac: 0.86, scoredFrames: 120, torsoAngle: 19.4 }, result: { ok: true, score: 77, parts: [{ key: 'body', pts: 40, max: 50, value: '19 degrees from flat' }, { key: 'head', pts: 30, max: 30, value: 'nose above shoulders by 0.20 body-lengths' }, { key: 'rhythm', pts: 7, max: 20, value: '30 strokes per minute' }], tips: ['Body line is a little low.', 'Head position looks right.', 'Strokes are slow.'], issues: ['hips_slightly_low', 'head_ok', 'rhythm_slow'] }, perFrame, times, moving, stroke: 'freestyle', swimmer: 'Maya', date: '2026-10-17T20:00:00.000Z' };
const b = packLap(run, fps);
assert.ok(/^[A-Za-z0-9_-]+$/.test(b), 'url-safe'); assert.ok(b.length < 2500, 'short enough for a text message: ' + b.length);
const r = unpackLap(b);
assert.ok(r.shared && r.result.ok && r.result.score === 77 && r.result.parts[1].name === 'Head position' && r.result.tips.length === 3);
assert.strictEqual(r.swimmer, 'Maya'); assert.strictEqual(r.summary.torsoAngle, 19); assert.ok(r.perFrame.length >= 50 && r.perFrame.length <= 61, 'downsampled: ' + r.perFrame.length);
assert.strictEqual(r.perFrame[0], null, 'unreadable frames stay null'); assert.strictEqual(r.moving[0], false);
const refused = unpackLap(packLap({ summary: { readableFrac: 0.1, scoredFrames: 0, torsoAngle: null }, result: { ok: false, reason: 'too dark' }, perFrame: [null, null], times: [0, 0.1], moving: [false, false], stroke: 'kick', swimmer: '' }, fps));
assert.ok(!refused.result.ok && refused.result.reason === 'too dark' && refused.summary.torsoAngle === null);
console.log('share.test.js: all checks passed');
