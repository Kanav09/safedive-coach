// SafeDive Coach: turns pose keypoints into swim-form numbers.
// Pure functions, no browser APIs, so they can be tested with plain Node.
// Keypoint order is the 17-point COCO layout used by MoveNet:
// 0 nose, 5/6 shoulders, 7/8 elbows, 9/10 wrists, 11/12 hips, 13/14 knees, 15/16 ankles.
// Each keypoint is {x, y, score}. Image y grows downward.

const KP = { NOSE: 0, LSH: 5, RSH: 6, LWR: 9, RWR: 10, LHIP: 11, RHIP: 12, LKN: 13, RKN: 14, LANK: 15, RANK: 16 };
const KP_THR = 0.4;      // a joint counts as seen above this confidence (87-clip study: 0.3 reads 3 points more but adds standing frames; 0.5 loses a fifth)
// A torso steeper than this in the picture is a person standing, treading, climbing out or resting at the wall, never a
// swimming posture: true trunk incline while swimming never exceeds about 21° (Zamparo 2009), 30–35° in a deck-held
// phone's view. Such frames are counted (so the app can say 'I mostly saw them upright') but never scored as a lap.
const UPRIGHT_MAX = 60;

function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function seen(k) { return k && k.score >= KP_THR; }

// One frame -> metrics, or null when the torso is not readable (confidence gate).
function frameMetrics(kps) {
  const torsoOk = [KP.LSH, KP.RSH, KP.LHIP, KP.RHIP].every(i => seen(kps[i]));
  if (!torsoOk) return null;
  const sh = mid(kps[KP.LSH], kps[KP.RSH]);
  const hp = mid(kps[KP.LHIP], kps[KP.RHIP]);
  const dx = hp.x - sh.x, dy = hp.y - sh.y;
  const torsoLen = Math.hypot(dx, dy);
  if (torsoLen < 4) return null;
  // 0 = body flat on the water, 90 = body standing up in the picture
  const torsoAngle = Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI;
  const hipDrop = dy / torsoLen;                       // + means hips lower than shoulders
  let headLift = null;
  if (seen(kps[KP.NOSE])) headLift = (sh.y - kps[KP.NOSE].y) / torsoLen; // + means nose above shoulders
  let wristY = null;
  const ws = [KP.LWR, KP.RWR].filter(i => seen(kps[i])).map(i => kps[i].y);
  if (ws.length) wristY = Math.min(...ws) / torsoLen;
  return { torsoAngle, hipDrop, headLift, wristY, torsoLen, shX: sh.x, shY: sh.y };
}

// Frames where the swimmer is not travelling (standing at the wall, resting) must not be scored.
// A frame counts as "moving" when the shoulders travel at least minBodyPerSec torso-lengths per second
// over a window of `win` frames around it.
function markMoving(frames, fps, win = 15, minBodyPerSec = 0.35) {
  const out = frames.map(() => false);
  for (let i = 0; i < frames.length; i++) {
    if (!frames[i]) continue;
    // nearest readable frames up to `win` frames before and after (readable frames are often sparse in water)
    let j0 = -1, j1 = -1;
    for (let j = i - 1; j >= Math.max(0, i - win); j--) if (frames[j]) { j0 = j; break; }
    for (let j = i + 1; j <= Math.min(frames.length - 1, i + win); j++) if (frames[j]) { j1 = j; break; }
    if (j0 < 0) j0 = i;
    if (j1 < 0) j1 = i;
    if (j0 === j1) continue;
    const a = frames[j0], b = frames[j1];
    const dist = Math.hypot(b.shX - a.shX, b.shY - a.shY) / frames[i].torsoLen;
    const secs = (j1 - j0) / fps;
    out[i] = dist / secs >= minBodyPerSec;
  }
  return out;
}

// Dominant up-and-down rhythm of the wrists, in cycles per second, or null if too short.
function strokeRate(wristSeries, fps) {
  const s = wristSeries.filter(v => v !== null && v !== undefined);
  if (s.length < fps * 1.5) return null;
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  const x = s.map(v => v - mean);
  let best = null, bestPow = -1;
  for (let f = 0.3; f <= 3.0; f += 0.05) {            // simple DFT scan over the human stroke band
    let re = 0, im = 0;
    for (let n = 0; n < x.length; n++) { const w = 2 * Math.PI * f * n / fps; re += x[n] * Math.cos(w); im -= x[n] * Math.sin(w); }
    const p = re * re + im * im;
    if (p > bestPow) { bestPow = p; best = f; }
  }
  return best;
}

function median(arr) {
  const a = arr.filter(v => v !== null && !Number.isNaN(v)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// Whole clip -> summary the scorer uses. `perFrame` is an array of frameMetrics() results (null allowed).
// A frame is scored only when the torso is readable, the swimmer is travelling, and the body is not upright.
function clipSummary(perFrame, fps) {
  const n = perFrame.length;
  const readable = perFrame.filter(Boolean).length;
  const moving = markMoving(perFrame, fps);
  const scored = perFrame.filter((f, i) => f && moving[i] && f.torsoAngle <= UPRIGHT_MAX);
  const upright = perFrame.filter(f => f && f.torsoAngle > UPRIGHT_MAX).length;
  return {
    frames: n,
    seconds: n / fps,
    readableFrac: n ? readable / n : 0,
    movingFrac: n ? scored.length / n : 0,
    uprightFrac: n ? upright / n : 0,
    torsoAngle: median(scored.map(f => f.torsoAngle)),
    hipDrop: median(scored.map(f => f.hipDrop)),
    headLift: median(scored.map(f => f.headLift)),
    strokeHz: strokeRate(scored.map(f => f.wristY), fps),
    scoredFrames: scored.length,
  };
}

// Which frames a results screen should mark as scored: the same rule as clipSummary, exposed so the chart and the summary agree.
function scoredMask(perFrame, fps) { const moving = markMoving(perFrame, fps); return perFrame.map((f, i) => !!(f && moving[i] && f.torsoAngle <= UPRIGHT_MAX)); }

if (typeof module !== 'undefined') module.exports = { KP, KP_THR, UPRIGHT_MAX, frameMetrics, markMoving, strokeRate, median, clipSummary, scoredMask };
