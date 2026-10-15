// SafeDive Coach: YOLO11-pose in the browser through onnxruntime-web.
// Why not MoveNet: on real pool footage MoveNet read the swimmer's torso in 0-33% of frames,
// YOLO11-pose read 53-100% (see ../feasibility/RESULTS.md). Swimmers are small and half under water.
//
// Model: models/yolo/yolo11n-pose.onnx, input [1,3,640,640] RGB 0..1, output [1,56,8400]:
// rows 0-3 box (cx, cy, w, h) in input pixels, row 4 person confidence, rows 5..55 = 17 x (x, y, score).
// Output keypoints use the same {x, y, score} shape metrics.js expects, in source-image pixels.

let YOLO_INPUT = 640;   // set from the model's declared input size at load()

class YoloPose {
  constructor(ort, modelUrl, inputSize = 640) { this.ort = ort; this.modelUrl = modelUrl; this.inputSize = inputSize; this.session = null; this.inputName = null; }

  async load() {
    const opts = { executionProviders: ['wasm'] };
    this.session = await this.ort.InferenceSession.create(this.modelUrl, opts);
    this.inputName = this.session.inputNames[0];
    if (this.inputSize) YOLO_INPUT = this.inputSize;
    return this;
  }

  // Letterbox any image source into a 640x640 float tensor. Returns the tensor and the mapping back to source pixels.
  // `getPixels(w, h)` must draw the source into a canvas of that size and return its RGBA bytes.
  preprocess(srcW, srcH, getPixels) {
    const r = YOLO_INPUT / Math.max(srcW, srcH);
    const nw = Math.round(srcW * r), nh = Math.round(srcH * r);
    const dx = Math.floor((YOLO_INPUT - nw) / 2), dy = Math.floor((YOLO_INPUT - nh) / 2);
    const rgba = getPixels(nw, nh);                           // Uint8ClampedArray, nw*nh*4
    const area = YOLO_INPUT * YOLO_INPUT;
    const data = new Float32Array(3 * area).fill(114 / 255);   // grey padding like ultralytics
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        const s = (y * nw + x) * 4, d = (y + dy) * YOLO_INPUT + (x + dx);
        data[d] = rgba[s] / 255; data[area + d] = rgba[s + 1] / 255; data[2 * area + d] = rgba[s + 2] / 255;
      }
    }
    return { tensor: new this.ort.Tensor('float32', data, [1, 3, YOLO_INPUT, YOLO_INPUT]), r, dx, dy };
  }

  // Decode [1,56,8400] -> list of people {score, box:[x1,y1,x2,y2], keypoints:[{x,y,score}]} in source pixels, NMS applied.
  static decode(out, r, dx, dy, confThr = 0.25, iouThr = 0.5) {
    const n = out.dims[2], d = out.data, people = [];
    for (let i = 0; i < n; i++) {
      const score = d[4 * n + i];
      if (score < confThr) continue;
      const cx = d[i], cy = d[n + i], w = d[2 * n + i], h = d[3 * n + i];
      const box = [(cx - w / 2 - dx) / r, (cy - h / 2 - dy) / r, (cx + w / 2 - dx) / r, (cy + h / 2 - dy) / r];
      const keypoints = [];
      for (let k = 0; k < 17; k++) keypoints.push({ x: (d[(5 + 3 * k) * n + i] - dx) / r, y: (d[(6 + 3 * k) * n + i] - dy) / r, score: d[(7 + 3 * k) * n + i] });
      people.push({ score, box, keypoints });
    }
    people.sort((a, b) => b.score - a.score);
    const keep = [];
    for (const p of people) {
      if (keep.every(q => YoloPose.iou(p.box, q.box) < iouThr)) keep.push(p);
    }
    return keep;
  }

  static iou(a, b) {
    const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])), iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
    const inter = ix * iy, ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter;
    return ua > 0 ? inter / ua : 0;
  }

  async run(srcW, srcH, getPixels) {
    const { tensor, r, dx, dy } = this.preprocess(srcW, srcH, getPixels);
    const out = (await this.session.run({ [this.inputName]: tensor }))[this.session.outputNames[0]];
    return YoloPose.decode(out, r, dx, dy);
  }
}

if (typeof module !== 'undefined') module.exports = { YoloPose, YOLO_INPUT };
