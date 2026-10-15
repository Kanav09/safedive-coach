// Checks the JSON record the app exports (js/report.js) against the shape promised in docs/ANALYSIS_SCHEMA.md.
const assert = require('assert');
global.markMoving = require('../js/metrics.js').markMoving;
const { scoreClip, scoreWord, STROKES } = require('../js/scoring.js');
global.scoreWord = scoreWord; global.STROKES = STROKES; global.NO_DRILL = require('../js/drills.js').NO_DRILL;
const { resultToJSON, APP_VERSION } = require('../js/report.js');
const { clipSummary, frameMetrics } = require('../js/metrics.js');

// a fake lap: 40 frames at 8 fps, flat body travelling left to right, nose visible, wrists bobbing
const fps = 8, perFrame = [], times = [];
for (let i = 0; i < 40; i++) {
  const x = 100 + i * 12;
  const kps = Array.from({ length: 17 }, () => ({ x: 0, y: 0, score: 0 }));
  kps[0] = { x: x - 30, y: 90, score: 0.9 }; kps[5] = { x, y: 100, score: 0.9 }; kps[6] = { x, y: 104, score: 0.9 };
  kps[11] = { x: x + 60, y: 108, score: 0.9 }; kps[12] = { x: x + 60, y: 112, score: 0.9 };
  kps[9] = { x: x - 10, y: 100 + 20 * Math.sin(i / 2), score: 0.8 };
  perFrame.push(i % 7 === 3 ? null : frameMetrics(kps)); times.push(i / fps);
}
const summary = clipSummary(perFrame, fps);
const result = scoreClip(summary, 'backstroke', fps);
const run = { summary, result, perFrame, times, stroke: 'backstroke', swimmer: 'Maya' };
const j = resultToJSON(run, fps);

assert.strictEqual(j.app, 'SafeDive Coach'); assert.strictEqual(j.version, APP_VERSION);
assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(j.created), 'created is ISO');
assert.strictEqual(j.swimmer, 'Maya'); assert.strictEqual(j.stroke, 'backstroke');
assert.deepStrictEqual(Object.keys(j.clip), ['seconds', 'framesAnalysed', 'sampleFps']);
assert.strictEqual(j.clip.framesAnalysed, 40); assert.strictEqual(j.clip.sampleFps, 8);
assert.deepStrictEqual(Object.keys(j.readability), ['readableFrac', 'movingFrac', 'scoredSeconds']);
assert.deepStrictEqual(Object.keys(j.metrics), ['torsoAngleDeg', 'headLift', 'strokeRateSpm']);
assert.ok(result.ok, 'fake lap should be scorable: ' + JSON.stringify(result));
assert.strictEqual(j.score.total, result.score); assert.strictEqual(j.score.word, scoreWord(result.score));
assert.deepStrictEqual(j.score.parts.map(p => p.key), ['body', 'head', 'rhythm']);
assert.strictEqual(j.issues.length, j.tips.length); assert.strictEqual(j.refused, null);
assert.strictEqual(j.timeline.length, 40); assert.strictEqual(j.timeline[3].angle, null); assert.strictEqual(typeof j.timeline[0].moving, 'boolean');
assert.ok(j.timeline.every(f => 'angle' in f && 't' in f));
assert.ok(JSON.stringify(j).length < 20000, 'record stays small');

// refused clip
const refused = resultToJSON({ summary: clipSummary(perFrame.map(() => null), fps), result: { ok: false, reason: 'nope' }, perFrame: perFrame.map(() => null), times, stroke: 'freestyle', swimmer: '' }, fps);
assert.strictEqual(refused.score, null); assert.deepStrictEqual(refused.refused, { reason: 'nope' }); assert.strictEqual(refused.swimmer, null);
console.log('report.test.js: all checks passed');
