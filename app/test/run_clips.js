// End-to-end check of the app's pipeline without a browser:
// raw RGB frames (dumped by Python) -> MoveNet (same model file the app ships) -> metrics.js -> scoring.js
// Run: node test/run_clips.js
global.self = global;
const tf = require('../vendor/tf.min.js');
const fs = require('fs'), path = require('path');
const { frameMetrics, clipSummary } = require('../js/metrics.js');
const { scoreClip } = require('../js/scoring.js');

const MODEL = path.join(__dirname, '..', 'models', process.env.MODEL || 'movenet-lightning', 'model.json');
const INPUT = Number(process.env.INPUT || 192);                       // MoveNet Lightning input size

// tfjs in Node has no fetch for file://, so load the graph model through a custom IO handler.
async function loadModel() {
  const json = JSON.parse(fs.readFileSync(MODEL, 'utf8'));
  const dir = path.dirname(MODEL);
  const handler = {
    load: async () => {
      const bufs = json.weightsManifest.flatMap(g => g.paths.map(p => fs.readFileSync(path.join(dir, p))));
      const total = bufs.reduce((a, b) => a + b.length, 0);
      const weightData = new ArrayBuffer(total); let off = 0;
      for (const b of bufs) { new Uint8Array(weightData, off, b.length).set(b); off += b.length; }
      return { modelTopology: json.modelTopology, weightSpecs: json.weightsManifest.flatMap(g => g.weights), weightData, format: json.format, generatedBy: json.generatedBy, convertedBy: json.convertedBy, signature: json.signature };
    },
  };
  return tf.loadGraphModel(handler);
}

// Same keypoint layout the browser pose-detection library returns: [{x, y, score}] in frame pixels.
function movenet(model, rgb, h, w) {
  return tf.tidy(() => {
    const img = tf.tensor3d(rgb, [h, w, 3], 'int32');
    const s = Math.max(h, w);                         // pad to square, like pose-detection does
    const padded = tf.pad(img, [[0, s - h], [0, s - w], [0, 0]]);
    const input = tf.image.resizeBilinear(padded.expandDims(0), [INPUT, INPUT]).toInt();
    const out = model.execute(input);                 // [1,1,17,3] = (y, x, score) normalized
    const arr = out.dataSync();
    const kps = [];
    for (let i = 0; i < 17; i++) kps.push({ y: arr[i * 3] * s, x: arr[i * 3 + 1] * s, score: arr[i * 3 + 2] });
    return kps;
  });
}

(async () => {
  await tf.setBackend('cpu'); await tf.ready();
  const model = await loadModel();
  const dir = path.join(__dirname, process.env.FRAMES || 'frames');
  const names = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  const rows = [];
  for (const name of names) {
    const meta = JSON.parse(fs.readFileSync(path.join(dir, name + '.json')));
    const raw = fs.readFileSync(path.join(dir, name + '.rgb'));
    const frameBytes = meta.h * meta.w * 3;
    const perFrame = []; const t0 = Date.now();
    for (let i = 0; i < meta.n; i++) {
      const rgb = new Int32Array(raw.subarray(i * frameBytes, (i + 1) * frameBytes));
      perFrame.push(frameMetrics(movenet(model, rgb, meta.h, meta.w)));
    }
    const ms = (Date.now() - t0) / meta.n;
    const stroke = name.startsWith('normal') ? 'freestyle' : 'freestyle';
    const summary = clipSummary(perFrame, meta.fps);
    const result = scoreClip(summary, stroke, meta.fps);
    rows.push({ clip: name, frames: meta.n, msPerFrame: ms.toFixed(0), readable: (summary.readableFrac * 100).toFixed(0) + '%', moving: (summary.movingFrac * 100).toFixed(0) + '%', angle: summary.torsoAngle === null ? '-' : summary.torsoAngle.toFixed(0), score: result.ok ? result.score : 'REFUSED', why: result.ok ? result.tips[0] : result.reason.slice(0, 70) });
    console.log(JSON.stringify(rows[rows.length - 1]));
  }
  fs.writeFileSync(path.join(__dirname, 'run_clips.out.json'), JSON.stringify(rows, null, 2));
  console.log('DONE');
})().catch(e => { console.error(e); process.exit(1); });
