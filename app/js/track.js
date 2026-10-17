// SafeDive Coach: which person in the frame is the swimmer. A pool has bystanders, and the most confident detection
// is not always the same person from one frame to the next. Once a swimmer has been picked, keep following whoever
// is nearest to where they were, as long as the jump is no bigger than their own box; otherwise fall back to the
// most confident person. Pure function, so it is unit tested and usable from both the clip loop and the live loop.

// Defaults set by the 87-clip study (feasibility/v04/RESULTS.md): follow the swimmer within one box diagonal, median over 3 samples.
const TRACK = { maxJump: 1.0, smoothWin: 3 };

function boxCentre(b) { return { x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2 }; }
function boxDiag(b) { return Math.hypot(b[2] - b[0], b[3] - b[1]); }

// people: [{score, box:[x1,y1,x2,y2], keypoints}], prev: the person followed in the previous frame (or null).
// maxJump: how far (in previous-box diagonals) the swimmer may move between two sampled frames and still be the same person.
function pickSwimmer(people, prev, maxJump = 1.0) {
  if (!people || !people.length) return null;
  if (prev && prev.box) {
    const c = boxCentre(prev.box), d = boxDiag(prev.box) || 1;
    let best = null, bestDist = Infinity;
    for (const p of people) { const q = boxCentre(p.box); const dist = Math.hypot(q.x - c.x, q.y - c.y); if (dist < bestDist) { bestDist = dist; best = p; } }
    if (best && bestDist <= maxJump * d) return best;
  }
  return people.reduce((a, p) => (p.score > a.score ? p : a), people[0]);
}

// Temporal median of keypoints over the last `win` detections of the same swimmer: removes single-frame flicker
// without lagging a real movement by more than one sample. `history` is the caller's array of recent keypoint sets.
function smoothKeypoints(history, win = 3) {
  const recent = history.slice(-win);
  if (recent.length < 2) return recent[recent.length - 1] || null;
  const out = [];
  for (let k = 0; k < 17; k++) {
    const xs = recent.map(h => h[k].x).sort((a, b) => a - b), ys = recent.map(h => h[k].y).sort((a, b) => a - b);
    const mid = Math.floor(xs.length / 2);
    const med = arr => (arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2);
    out.push({ x: med(xs), y: med(ys), score: recent[recent.length - 1][k].score });
  }
  return out;
}

if (typeof module !== 'undefined') module.exports = { TRACK, pickSwimmer, smoothKeypoints };
