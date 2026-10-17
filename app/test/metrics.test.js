// Run with: node test/metrics.test.js
const assert = require('assert');
const M = require('../js/metrics.js');

function body(opts) {
  // Build a 17-point skeleton. shoulders at (sx, sy), hips offset by (dx, dy), nose above shoulders by `nose`.
  const { sx = 100, sy = 100, dx = 60, dy = 0, nose = 20, score = 0.9, wristY = null } = opts;
  const k = Array.from({ length: 17 }, () => ({ x: 0, y: 0, score: 0 }));
  k[0] = { x: sx, y: sy - nose, score };
  k[5] = { x: sx, y: sy - 5, score }; k[6] = { x: sx, y: sy + 5, score };
  k[11] = { x: sx + dx, y: sy + dy - 5, score }; k[12] = { x: sx + dx, y: sy + dy + 5, score };
  if (wristY !== null) k[9] = { x: sx, y: wristY, score };
  return k;
}

// 1. flat body reads ~0 deg, vertical body ~90 deg
assert.ok(M.frameMetrics(body({ dx: 60, dy: 0 })).torsoAngle < 1, 'flat body should be ~0 deg');
assert.ok(M.frameMetrics(body({ dx: 0, dy: 60 })).torsoAngle > 89, 'vertical body should be ~90 deg');
assert.ok(Math.abs(M.frameMetrics(body({ dx: 60, dy: 60 })).torsoAngle - 45) < 0.5, '45 deg body');

// 2. confidence gate: hidden hips -> null
assert.strictEqual(M.frameMetrics(body({ score: 0.2 })), null, 'low confidence torso must be refused');

// 3. hip drop sign and head lift
assert.ok(M.frameMetrics(body({ dx: 60, dy: 30 })).hipDrop > 0, 'hips lower on screen -> positive drop');
assert.ok(M.frameMetrics(body({ nose: 30 })).headLift > 0, 'nose above shoulders -> positive lift');

// 4. moving filter: a swimmer travelling across the frame counts, a swimmer parked at the wall does not
const fps = 30;
const travelling = Array.from({ length: 60 }, (_, i) => M.frameMetrics(body({ sx: 100 + i * 3 })));   // 3 px/frame = 1.5 body/s
const parked = Array.from({ length: 60 }, () => M.frameMetrics(body({ sx: 100 })));
assert.ok(M.markMoving(travelling, fps).filter(Boolean).length > 50, 'travelling frames should be marked moving');
assert.strictEqual(M.markMoving(parked, fps).filter(Boolean).length, 0, 'parked frames must not be scored');

// 5. stroke rate recovers a planted 1 Hz wrist rhythm
const wrist = Array.from({ length: 90 }, (_, i) => Math.sin(2 * Math.PI * 1.0 * i / fps));
assert.ok(Math.abs(M.strokeRate(wrist, fps) - 1.0) < 0.1, 'stroke rate should be ~1 Hz');
assert.strictEqual(M.strokeRate(wrist.slice(0, 20), fps), null, 'too short -> null');

// 6. clip summary on a travelling flat swimmer
const s = M.clipSummary(travelling, fps);
assert.ok(s.readableFrac === 1 && s.torsoAngle < 1 && s.scoredFrames > 50, 'summary of a clean flat lap');
// and on a parked swimmer: readable but nothing scored
const p = M.clipSummary(parked, fps);
assert.ok(p.readableFrac === 1 && p.scoredFrames === 0 && p.torsoAngle === null, 'parked swimmer yields no score');

console.log('metrics.test.js: all 12 checks passed');

// 7. moving filter must survive gaps: every other frame unreadable, swimmer still travelling
const gappy = Array.from({ length: 60 }, (_, i) => (i % 2 ? null : M.frameMetrics(body({ sx: 100 + i * 3 }))));
assert.ok(M.markMoving(gappy, fps).filter(Boolean).length > 25, 'gappy travelling frames should still be marked moving');
console.log('gap check passed');

// v0.4: upright frames (standing at the wall, treading) never count toward a lap, and the summary says how many there were
{
  const { clipSummary, scoredMask, UPRIGHT_MAX } = require('../js/metrics.js');
  const flat = i => ({ torsoAngle: 15, hipDrop: 0.2, headLift: 0.2, wristY: 1 + (i % 4) / 4, torsoLen: 50, shX: 20 * i, shY: 100 });
  const upright = i => ({ torsoAngle: 85, hipDrop: 1, headLift: 0.4, wristY: 2, torsoLen: 50, shX: 20 * i, shY: 100 });
  const fps = 8;
  const walking = Array.from({ length: 40 }, (_, i) => upright(i));         // a kid walking along the wall: moving, but upright
  const s1 = clipSummary(walking, fps);
  assert.strictEqual(s1.scoredFrames, 0, 'upright frames are never scored even when they travel');
  assert.ok(s1.uprightFrac > 0.9 && s1.readableFrac > 0.9);
  const lap = Array.from({ length: 40 }, (_, i) => (i < 8 ? upright(i) : flat(i)));   // push-off from the wall then a flat lap
  const s2 = clipSummary(lap, fps);
  assert.ok(s2.scoredFrames >= 28 && s2.torsoAngle === 15, 'the flat travelling stretch is scored and the wall frames are not: ' + s2.scoredFrames);
  const mask = scoredMask(lap, fps); assert.strictEqual(mask.slice(0, 8).some(Boolean), false); assert.ok(mask.slice(10).every(Boolean));
  assert.ok(UPRIGHT_MAX >= 55 && UPRIGHT_MAX <= 65);
  const { scoreClip } = require('../js/scoring.js');
  const r = scoreClip(s1, 'freestyle', fps); assert.ok(!r.ok && /upright/.test(r.reason), 'refusal names the upright problem: ' + r.reason);
  console.log('upright rule checks passed');
}
