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
// over a window of `winSec` seconds around it. The window is in seconds, not frames, so a phone that reads
// 4 frames a second judges a lap the same way as one that reads 8.
function markMoving(frames, fps, winSec = 2, minBodyPerSec = 0.35) {
  const win = Math.max(1, Math.round(winSec * fps));
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

// Dominant up-and-down rhythm of the wrists, in cycles per second, or null when there is not enough to go on.
// `wristSeries` has one entry per analysed frame (null where the wrists were not seen or the frame was not scored), so
// entry i is at time i / fps. Everything here is in seconds, not frames, so a phone reading 4 frames a second gets the
// same answer as one reading 8 (v0.6: before this, the rhythm points moved with the frame rate).
//   1. wild samples (a splash, the other wrist, a stray hand) are dropped: more than 3 median deviations from the median;
//   2. at least 2 s of wrist data, seen in at least half of those frames, or null;
//   3. the slow drift is removed (perspective changes the wrist height as the swimmer crosses the frame);
//   4. a DFT scan over the human stroke band on the real time axis, never above what the frame rate can tell apart;
//   5. a rhythm is reported only when one frequency carries most of the up-and-down (a pure wave scores 0.5 here, noise
//      near 1/n), it is not at the edge of the scan, and at least two and a half cycles are in view. Otherwise null, and the
//      scorer gives half marks with "no steady rhythm seen" rather than a number it cannot stand behind.
function strokeRate(wristSeries, fps) {
  let t = [], v = [];
  wristSeries.forEach((w, i) => { if (w !== null && w !== undefined) { t.push(i / fps); v.push(w); } });
  if (v.length < 8) return null;
  const m0 = median(v), mad = median(v.map(x => Math.abs(x - m0))) || 1e-9;
  const keep = v.map(x => Math.abs(x - m0) <= 3 * 1.4826 * mad);
  t = t.filter((_, i) => keep[i]); v = v.filter((_, i) => keep[i]);
  const span = t.length ? t[t.length - 1] - t[0] : 0;
  if (v.length < 8 || span < 2) return null;
  if (v.length < 0.5 * span * fps) return null;
  const n = v.length, tm = t.reduce((a, b) => a + b, 0) / n, vm = v.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (t[i] - tm) * (v[i] - vm); sxx += (t[i] - tm) ** 2; }
  const slope = sxx ? sxy / sxx : 0;
  const x = v.map((y, i) => y - vm - slope * (t[i] - tm));
  const fMin = 0.4, fMax = Math.min(3.0, 0.45 * fps);
  let best = null, bestPow = -1;
  for (let f = fMin; f <= fMax + 1e-9; f += 0.05) {
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) { const w = 2 * Math.PI * f * t[i]; re += x[i] * Math.cos(w); im -= x[i] * Math.sin(w); }
    const p = re * re + im * im;
    if (p > bestPow) { bestPow = p; best = f; }
  }
  const energy = x.reduce((a, y) => a + y * y, 0);
  const share = energy ? bestPow / (n * energy) : 0;
  if (best === null || best <= fMin + 1e-9 || best >= fMax - 1e-9) return null;
  if (share < 0.3 || best * span < 2.5) return null;
  return +best.toFixed(2);
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
    strokeHz: strokeRate(perFrame.map((f, i) => (f && moving[i] && f.torsoAngle <= UPRIGHT_MAX ? f.wristY : null)), fps),   // scored frames only, kept in their place on the clock
    scoredFrames: scored.length,
  };
}

// Which frames a results screen should mark as scored: the same rule as clipSummary, exposed so the chart and the summary agree.
function scoredMask(perFrame, fps) { const moving = markMoving(perFrame, fps); return perFrame.map((f, i) => !!(f && moving[i] && f.torsoAngle <= UPRIGHT_MAX)); }

if (typeof module !== 'undefined') module.exports = { KP, KP_THR, UPRIGHT_MAX, frameMetrics, markMoving, strokeRate, median, clipSummary, scoredMask };
