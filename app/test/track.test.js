// Following the swimmer: stick with the nearest person to where they were, fall back to confidence, and smooth flicker.
const assert = require('assert');
const { pickSwimmer, smoothKeypoints } = require('../js/track.js');
const P = (score, x, y, s = 100) => ({ score, box: [x - s / 2, y - s / 2, x + s / 2, y + s / 2], keypoints: [] });
assert.strictEqual(pickSwimmer([], null), null);
const a = P(0.9, 100, 100), b = P(0.6, 500, 100);
assert.strictEqual(pickSwimmer([a, b], null), a, 'no history: most confident');
const a2 = P(0.5, 120, 105), b2 = P(0.95, 500, 100);
assert.strictEqual(pickSwimmer([a2, b2], a), a2, 'history: nearest to the previous swimmer wins even when less confident');
const far = P(0.5, 400, 100);
assert.strictEqual(pickSwimmer([far, b2], a), b2, 'nobody near the previous position: most confident');
const kp = (x, y) => Array.from({ length: 17 }, () => ({ x, y, score: 0.9 }));
assert.strictEqual(smoothKeypoints([], 3), null); assert.strictEqual(smoothKeypoints([kp(1, 1)], 3)[0].x, 1);
const sm = smoothKeypoints([kp(10, 10), kp(50, 50), kp(12, 12)], 3);
assert.strictEqual(sm[0].x, 12, 'a one-frame jump to 50 is ignored by the median'); assert.strictEqual(sm[0].score, 0.9);
const lag = smoothKeypoints([kp(10, 10), kp(20, 20), kp(30, 30)], 3);
assert.strictEqual(lag[0].x, 20, 'a steady movement lags by one sample, never more');
console.log('track.test.js: all checks passed');
