// The float test must tolerate short gaps (splash hides the hips) but not long ones, and count both float and tread.
const assert = require('assert');
const { SKILLS, floatTest, floatState, skillsDone } = require('../js/safety.js');
assert.strictEqual(SKILLS.length, 5); assert.strictEqual(SKILLS.filter(s => s.how === 'camera').length, 1);
const fps = 8, F = { torsoAngle: 20 }, T = { torsoAngle: 80 }, B = { torsoAngle: 45 };
assert.strictEqual(floatState(F), 'float'); assert.strictEqual(floatState(T), 'tread'); assert.strictEqual(floatState(B), 'between'); assert.strictEqual(floatState(null), null);
const rep = (x, n) => Array(n).fill(x);
let r = floatTest(rep(T, 70 * fps), fps); assert.ok(r.pass && r.seconds >= 70 && r.mode === 'tread', JSON.stringify(r));
r = floatTest(rep(F, 30 * fps), fps); assert.ok(!r.pass && Math.abs(r.seconds - 30) < 0.2 && r.mode === 'float');
r = floatTest([...rep(F, 40 * fps), ...rep(null, 1 * fps), ...rep(F, 25 * fps)], fps); assert.ok(r.pass, 'a one-second gap is bridged: ' + r.seconds);
r = floatTest([...rep(F, 40 * fps), ...rep(null, 5 * fps), ...rep(F, 25 * fps)], fps); assert.ok(!r.pass && r.seconds < 41, 'a five-second gap breaks the run: ' + r.seconds);
r = floatTest([...rep(F, 20 * fps), ...rep(B, 4 * fps), ...rep(F, 20 * fps)], fps); assert.ok(!r.pass && r.seconds >= 44, 'a leaning tread still counts as at the surface: ' + r.seconds);
r = floatTest(rep(B, 65 * fps), fps); assert.ok(r.pass && r.mode === null, 'a whole minute leaning back passes; posture undecided');
r = floatTest(rep(null, 10 * fps), fps); assert.strictEqual(r.seconds, 0); assert.strictEqual(r.mode, null);
r = floatTest(rep(T, 35 * fps), fps, 30); assert.ok(r.pass && r.minSeconds === 30, 'shorter target for the practice run');
assert.strictEqual(skillsDone({ enter: {}, exit: {} }), 2); assert.strictEqual(skillsDone(null), 0);
console.log('safety.test.js: all checks passed');
