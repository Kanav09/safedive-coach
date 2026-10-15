global.self = global; const tf = require('../vendor/tf.min.js'); const fs = require('fs'), path = require('path');
(async () => {
  await tf.setBackend('cpu');
  const json = JSON.parse(fs.readFileSync('models/movenet-lightning/model.json', 'utf8'));
  const bufs = json.weightsManifest.flatMap(g => g.paths.map(p => fs.readFileSync(path.join('models/movenet-lightning', p))));
  const total = bufs.reduce((a, b) => a + b.length, 0); const wd = new ArrayBuffer(total); let off = 0; for (const b of bufs) { new Uint8Array(wd, off, b.length).set(b); off += b.length; }
  const model = await tf.loadGraphModel({ load: async () => ({ modelTopology: json.modelTopology, weightSpecs: json.weightsManifest.flatMap(g => g.weights), weightData: wd, format: json.format, signature: json.signature }) });
  console.log('inputs', model.inputs.map(i => i.name + ' ' + JSON.stringify(i.shape) + ' ' + i.dtype), 'outputs', model.outputs.map(o => o.name + ' ' + JSON.stringify(o.shape)));
  const meta = JSON.parse(fs.readFileSync('test/frames_roi/treading_water_IMG_0392.json')); const raw = fs.readFileSync('test/frames_roi/treading_water_IMG_0392.rgb');
  const fb = meta.h * meta.w * 3; const i = 40;
  const rgb = new Int32Array(raw.subarray(i * fb, (i + 1) * fb));
  console.log('pixel sample', Array.from(rgb.slice(0, 6)), 'max', Math.max(...rgb.slice(0, 10000)));
  const img = tf.tensor3d(rgb, [meta.h, meta.w, 3], 'int32');
  const input = tf.image.resizeBilinear(img.expandDims(0).toFloat(), [192, 192]).toInt();
  const out = model.execute(input); console.log('out shape', out.shape);
  const a = out.dataSync(); const kps = []; for (let k = 0; k < 17; k++) kps.push([+(a[k*3]).toFixed(2), +(a[k*3+1]).toFixed(2), +(a[k*3+2]).toFixed(2)]);
  console.log('y x score per keypoint:', JSON.stringify(kps));
})();
