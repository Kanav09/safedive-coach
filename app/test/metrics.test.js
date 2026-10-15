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
