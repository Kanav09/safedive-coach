// End-to-end check of the SHIPPED pipeline without a browser:
// raw RGB frames (dumped by Python) -> js/pose_yolo.js (onnxruntime-web, wasm) -> js/metrics.js -> js/scoring.js
// Run: node test/run_clips_yolo.js   (MODEL=yolo11s-pose FRAMES=frames to change)
const ort = require('onnxruntime-web');
const fs = require('fs'), path = require('path');
const { YoloPose } = require('../js/pose_yolo.js');
const { frameMetrics, clipSummary } = require('../js/metrics.js');
const { scoreClip } = require('../js/scoring.js');
const { TRACK, pickSwimmer, smoothKeypoints } = require('../js/track.js');
const FOLLOW = process.env.FOLLOW !== '0', SMOOTH = process.env.SMOOTH ? Number(process.env.SMOOTH) : TRACK.smoothWin;
ort.env.wasm.numThreads = 1;

// Node has no canvas: bilinear resize of an RGB frame into RGBA, the same contract (and close to the same pixels) as the
// browser's canvas drawImage. Nearest-neighbour sampling was used before and under-read the careful model by aliasing
// fine detail (feasibility/v04/RESULTS.md), so the harness now interpolates like the browser does.
function makeGetPixels(rgb, w, h) {
  return (nw, nh) => {
    const out = new Uint8ClampedArray(nw * nh * 4);
    const sxr = w / nw, syr = h / nh;
    for (let y = 0; y < nh; y++) {
      const fy = Math.min(h - 1, (y + 0.5) * syr - 0.5), y0 = Math.max(0, Math.floor(fy)), y1 = Math.min(h - 1, y0 + 1), wy = fy - y0;
      for (let x = 0; x < nw; x++) {
        const fx = Math.min(w - 1, (x + 0.5) * sxr - 0.5), x0 = Math.max(0, Math.floor(fx)), x1 = Math.min(w - 1, x0 + 1), wx = fx - x0;
        const a = (y0 * w + x0) * 3, b = (y0 * w + x1) * 3, c = (y1 * w + x0) * 3, e = (y1 * w + x1) * 3, d = (y * nw + x) * 4;
        for (let k = 0; k < 3; k++) out[d + k] = (rgb[a + k] * (1 - wx) + rgb[b + k] * wx) * (1 - wy) + (rgb[c + k] * (1 - wx) + rgb[e + k] * wx) * wy;
        out[d + 3] = 255;
      }
    }
    return out;
  };
}

(async () => {
  const modelName = process.env.MODEL || 'yolo11n-pose';
  const modelBytes = fs.readFileSync(path.join(__dirname, '..', 'models', 'yolo', modelName + '.onnx'));
  const inputSize = Number((modelName.match(/-(\d+)$/) || [0, 640])[1]);
  const pose = new YoloPose(ort, modelBytes, inputSize); await pose.load();
  const dir = path.join(__dirname, process.env.FRAMES || 'frames');
  const names = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  const rows = [];
  for (const name of names) {
    const meta = JSON.parse(fs.readFileSync(path.join(dir, name + '.json')));
    const raw = fs.readFileSync(path.join(dir, name + '.rgb'));
    const fb = meta.h * meta.w * 3; const perFrame = []; const t0 = Date.now(); let seen = 0, followed = null, history = [];
    for (let i = 0; i < meta.n; i++) {
      const people = await pose.run(meta.w, meta.h, makeGetPixels(raw.subarray(i * fb, (i + 1) * fb), meta.w, meta.h));
      if (people.length) seen++;
      followed = FOLLOW ? pickSwimmer(people, followed, TRACK.maxJump) : (people.length ? people.reduce((a, p) => (p.score > a.score ? p : a), people[0]) : null);
      if (followed) { history.push(followed.keypoints); if (history.length > SMOOTH) history.shift(); } else history = [];
      perFrame.push(followed ? frameMetrics(smoothKeypoints(history, SMOOTH)) : null);
    }
    const ms = (Date.now() - t0) / meta.n;
    const summary = clipSummary(perFrame, meta.fps);
    const result = scoreClip(summary, 'freestyle', meta.fps);
    const row = { clip: name, frames: meta.n, msPerFrame: ms.toFixed(0), personSeen: Math.round(100 * seen / meta.n) + '%', readable: Math.round(summary.readableFrac * 100) + '%', moving: Math.round(summary.movingFrac * 100) + '%', angle: summary.torsoAngle === null ? '-' : summary.torsoAngle.toFixed(0), score: result.ok ? result.score : 'REFUSED', why: (result.ok ? result.tips[0] : result.reason).slice(0, 60) };
    rows.push(row); console.log(JSON.stringify(row));
  }
  fs.writeFileSync(path.join(__dirname, `run_clips_yolo.${modelName}.json`), JSON.stringify(rows, null, 2));
  console.log('DONE');
})().catch(e => { console.error(e); process.exit(1); });
