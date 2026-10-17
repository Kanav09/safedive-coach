// SafeDive Coach: everything that draws on a canvas. No app state in here; every function takes what it needs.
// Keypoint layout is COCO-17 (see metrics.js). Colours match css/style.css: two inks, paper, black.
// The torso line is orange ink, the target line is aqua ink; where they cross on a chart the ink prints green (multiply).

const INK = { bone: '#f6f1e4', boneEdge: 'rgba(26,26,26,.85)', joint: '#00a6c8', torso: '#ff6a2a', target: '#00a6c8', text: '#f6f1e4', shade: 'rgba(26,26,26,.74)' };
const FONT_BODY = '"Atkinson Hyperlegible", "Helvetica Neue", Arial, sans-serif';
const FONT_DISPLAY = '"Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif';
const BONES = [[5, 6], [5, 7], [7, 9], [6, 8], [8, 10], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [0, 5], [0, 6]];

function dpr() { return window.devicePixelRatio || 1; }

// Skeleton with a highlighted torso line (shoulders midpoint to hips midpoint), the one line the score is built on.
function drawSkeleton(ctx, kps, opts = {}) {
  const thr = opts.thr !== undefined ? opts.thr : KP_THR;
  const s = opts.scale || Math.max(1, ctx.canvas.width / 640);
  const ok = i => kps[i] && kps[i].score >= thr;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [a, b] of BONES) {
    if (!ok(a) || !ok(b)) continue;
    ctx.beginPath(); ctx.moveTo(kps[a].x, kps[a].y); ctx.lineTo(kps[b].x, kps[b].y);
    ctx.lineWidth = 5 * s; ctx.strokeStyle = INK.boneEdge; ctx.stroke();
    ctx.lineWidth = 2.5 * s; ctx.strokeStyle = INK.bone; ctx.stroke();
  }
  for (let i = 0; i < kps.length; i++) {
    if (!ok(i)) continue;
    ctx.beginPath(); ctx.arc(kps[i].x, kps[i].y, 3.5 * s, 0, Math.PI * 2);
    ctx.fillStyle = INK.joint; ctx.fill(); ctx.lineWidth = 1.2 * s; ctx.strokeStyle = INK.bone; ctx.stroke();
  }
  if (ok(5) && ok(6) && ok(11) && ok(12)) {
    const sh = { x: (kps[5].x + kps[6].x) / 2, y: (kps[5].y + kps[6].y) / 2 };
    const hp = { x: (kps[11].x + kps[12].x) / 2, y: (kps[11].y + kps[12].y) / 2 };
    ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(hp.x, hp.y);
    ctx.lineWidth = 7 * s; ctx.strokeStyle = INK.boneEdge; ctx.stroke();
    ctx.lineWidth = 4 * s; ctx.strokeStyle = INK.torso; ctx.stroke();
    if (opts.target) drawTargetLine(ctx, sh, hp, opts.target, s);
  }
}

// Dashed "where the hips should be" line: same length as the torso, laid at the target angle from the shoulders.
function drawTargetLine(ctx, sh, hp, targetDeg, s) {
  const len = Math.hypot(hp.x - sh.x, hp.y - sh.y);
  const dirX = Math.sign(hp.x - sh.x) || 1;                 // keep the target on the same side as the real hips
  const a = targetDeg * Math.PI / 180;
  const tx = sh.x + dirX * len * Math.cos(a), ty = sh.y + len * Math.sin(a);
  ctx.save(); ctx.setLineDash([6 * s, 5 * s]); ctx.lineWidth = 3 * s; ctx.strokeStyle = INK.target;
  ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.restore();
  // the arc between the real torso and the target shows the angle to close
  const real = Math.atan2(hp.y - sh.y, hp.x - sh.x), goal = Math.atan2(ty - sh.y, tx - sh.x);
  ctx.save(); ctx.lineWidth = 2 * s; ctx.strokeStyle = INK.target; ctx.beginPath();
  ctx.arc(sh.x, sh.y, len * 0.45, Math.min(real, goal), Math.max(real, goal)); ctx.stroke(); ctx.restore();
}

// Corner label with a dark pill behind it so it reads on bright water.
function drawLabel(ctx, text, x = 10, y = 10) {
  const s = Math.max(1, ctx.canvas.width / 640);
  ctx.font = `700 ${15 * s}px ${FONT_BODY}`;
  const w = ctx.measureText(text).width + 18 * s, h = 26 * s;
  ctx.fillStyle = INK.shade; roundRect(ctx, x, y, w, h, 3 * s); ctx.fill();
  ctx.fillStyle = INK.text; ctx.textBaseline = 'middle'; ctx.fillText(text, x + 9 * s, y + h / 2);
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// Sizes a canvas to its CSS box at device resolution and returns {ctx, W, H, k} where k = CSS px -> canvas px.
function fitCanvas(cv, cssHeight) {
  const k = dpr(); const w = cv.clientWidth || cv.parentElement.clientWidth || 320;
  cv.style.height = cssHeight + 'px'; cv.width = Math.round(w * k); cv.height = Math.round(cssHeight * k);
  return { ctx: cv.getContext('2d'), W: cv.width, H: cv.height, k };
}
function cssVar(name, fallback) { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fallback; }

// Body angle over the clip. `cursorIndex` draws the scrubber position. Returns a function that maps a CSS x to a frame index.
function drawAngleChart(cv, perFrame, times, moving, cursorIndex) {
  const { ctx, W, H, k } = fitCanvas(cv, 150);
  const padL = 34 * k, padR = 10 * k, padT = 10 * k, padB = 22 * k;
  const tmax = Math.max(times[times.length - 1] || 1, 1);
  const xOf = t => padL + (W - padL - padR) * t / tmax, yOf = deg => padT + (H - padT - padB) * (1 - deg / 90);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = cssVar('--paper-bright', '#fffdf7'); ctx.fillRect(0, 0, W, H);
  // target band: the "great" zone from scoring.js, printed in aqua ink
  ctx.fillStyle = cssVar('--aqua', '#00a6c8'); ctx.fillRect(padL, yOf(THRESHOLDS.bodyLine.great), W - padL - padR, yOf(0) - yOf(THRESHOLDS.bodyLine.great));
  ctx.strokeStyle = cssVar('--hair', 'rgba(26,26,26,.22)'); ctx.lineWidth = 1 * k;
  ctx.font = `${12 * k}px ${FONT_BODY}`; ctx.fillStyle = cssVar('--ink-2', '#4f4b43'); ctx.textBaseline = 'middle';
  for (const deg of [0, 30, 60, 90]) { const y = yOf(deg); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(deg + '°', padL - 6 * k, y); }
  ctx.textAlign = 'left';
  for (let t = 0; t <= tmax; t += tmax > 12 ? 5 : 2) { ctx.fillText(t + 's', xOf(t), H - padB / 2); }
  // the line: orange ink through scored (moving) frames only, multiplied so it prints green inside the aqua band;
  // readable-but-still frames are short ink marks, never part of the line
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = cssVar('--sun', '#ff6a2a'); ctx.lineWidth = 3 * k; ctx.lineJoin = 'round'; ctx.beginPath(); let pen = false;
  perFrame.forEach((m, i) => { if (!m || !moving[i]) { pen = false; return; } const x = xOf(times[i]), y = yOf(m.torsoAngle); if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y); pen = true; });
  ctx.stroke(); ctx.restore();
  ctx.strokeStyle = cssVar('--ink', '#1a1a1a'); ctx.lineWidth = 1 * k;
  perFrame.forEach((m, i) => { if (m && !moving[i]) { const x = xOf(times[i]), y = yOf(m.torsoAngle); ctx.beginPath(); ctx.moveTo(x, y - 3 * k); ctx.lineTo(x, y + 3 * k); ctx.stroke(); } });
  if (cursorIndex !== undefined && cursorIndex !== null && times[cursorIndex] !== undefined) {
    const x = xOf(times[cursorIndex]); ctx.strokeStyle = cssVar('--ink', '#1a1a1a'); ctx.lineWidth = 2 * k;
    ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB); ctx.stroke();
    const m = perFrame[cursorIndex]; if (m) { ctx.fillStyle = cssVar('--ink', '#1a1a1a'); ctx.beginPath(); ctx.arc(x, yOf(m.torsoAngle), 4.5 * k, 0, Math.PI * 2); ctx.fill(); }
  }
  return cssX => { const t = (cssX * k - padL) / (W - padL - padR) * tmax; let best = 0; for (let i = 0; i < times.length; i++) if (Math.abs(times[i] - t) < Math.abs(times[best] - t)) best = i; return best; };
}

// One tile per analysed frame: green = readable and travelling, orange = readable but still, paper = not readable, blank = not yet.
function drawReadabilityStrip(cv, perFrame, moving, total) {
  const { ctx, W, H, k } = fitCanvas(cv, 14);
  ctx.clearRect(0, 0, W, H);
  const n = Math.max(total, 1), tw = W / n;
  for (let i = 0; i < perFrame.length; i++) {
    const m = perFrame[i];
    ctx.fillStyle = !m ? cssVar('--paper-deep', '#e8e0cc') : (moving && !moving[i]) ? cssVar('--sun', '#ff6a2a') : cssVar('--over', '#004521');
    ctx.fillRect(i * tw, 0, Math.max(tw - 0.5 * k, 1), H);
  }
}

// Score history, tappable. Returns a function mapping a CSS x to the session index in `sessions`.
function drawHistoryChart(cv, sessions, selected) {
  const { ctx, W, H, k } = fitCanvas(cv, 150);
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = cssVar('--paper-bright', '#fffdf7'); ctx.fillRect(0, 0, W, H);
  const padL = 30 * k, padB = 22 * k, padT = 8 * k; const n = sessions.length;
  const yOf = v => padT + (H - padT - padB) * (1 - v / 100);
  // the strong-lap zone (80 and up) is aqua ink; bars are orange and print green where they reach into it
  ctx.fillStyle = cssVar('--aqua', '#00a6c8'); ctx.fillRect(padL, yOf(100), W - padL - 6 * k, yOf(80) - yOf(100));
  ctx.fillStyle = cssVar('--ink', '#1a1a1a'); ctx.font = `700 ${11 * k}px ${FONT_BODY}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText('STRONG LAP  80+', padL + 6 * k, (yOf(100) + yOf(80)) / 2);
  ctx.strokeStyle = cssVar('--hair', 'rgba(26,26,26,.22)'); ctx.lineWidth = k; ctx.font = `${12 * k}px ${FONT_BODY}`; ctx.fillStyle = cssVar('--ink-2', '#4f4b43'); ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
  for (const v of [0, 50, 100]) { const y = yOf(v); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - 6 * k, y); ctx.stroke(); ctx.fillText(v, padL - 5 * k, y); }
  if (!n) return () => -1;
  const slot = (W - padL - 6 * k) / n, bw = Math.min(slot * 0.62, 34 * k);
  sessions.forEach((s, i) => {
    const x = padL + slot * i + (slot - bw) / 2, y = yOf(s.score);
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = cssVar('--sun', '#ff6a2a'); ctx.fillRect(x, y, bw, yOf(0) - y); ctx.restore();
    if (selected === i) { ctx.strokeStyle = cssVar('--ink', '#1a1a1a'); ctx.lineWidth = 2 * k; ctx.strokeRect(x - 2 * k, y - 2 * k, bw + 4 * k, yOf(0) - y + 2 * k); }
    ctx.fillStyle = cssVar('--ink-2', '#4f4b43'); ctx.textAlign = 'center';
    ctx.fillText(new Date(s.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }), x + bw / 2, H - padB / 2);
  });
  return cssX => { const i = Math.floor((cssX * k - padL) / slot); return i >= 0 && i < n ? i : -1; };
}

// The 31-clip study as a dot plot: median body angle by clip type, dot opacity by readability. Returns hit-test.
function drawStudyChart(cv, clips, selected) {
  const { ctx, W, H, k } = fitCanvas(cv, 230);
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = cssVar('--paper-bright', '#fffdf7'); ctx.fillRect(0, 0, W, H);
  const cols = [['swim', 'Swimming'], ['tread', 'Treading'], ['distress', 'Struggling']];
  const padL = 34 * k, padB = 26 * k, padT = 12 * k, colW = (W - padL - 8 * k) / cols.length;
  const yOf = deg => padT + (H - padT - padB) * (1 - deg / 90);
  ctx.strokeStyle = cssVar('--hair', 'rgba(26,26,26,.22)'); ctx.lineWidth = k; ctx.font = `${12 * k}px ${FONT_BODY}`; ctx.fillStyle = cssVar('--ink-2', '#4f4b43'); ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
  for (const deg of [0, 30, 60, 90]) { const y = yOf(deg); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - 8 * k, y); ctx.stroke(); ctx.fillText(deg + '°', padL - 6 * k, y); }
  ctx.fillStyle = cssVar('--aqua-pale', '#cfeaf1'); ctx.fillRect(padL, yOf(THRESHOLDS.bodyLine.ok), W - padL - 8 * k, yOf(0) - yOf(THRESHOLDS.bodyLine.ok));
  const pts = [];
  cols.forEach(([cls, label], c) => {
    const x0 = padL + colW * c; ctx.textAlign = 'center'; ctx.fillStyle = cssVar('--ink', '#1a1a1a'); ctx.font = `700 ${13 * k}px ${FONT_BODY}`; ctx.fillText(label, x0 + colW / 2, H - padB / 2);
    const rows = clips.filter(q => q.cls === cls && q.angle !== null);
    rows.forEach((q, i) => {
      const jitter = ((i * 7919) % 11 - 5) / 5;                      // deterministic spread so dots do not stack
      const x = x0 + colW / 2 + jitter * colW * 0.28, y = yOf(q.angle);
      const col = cls === 'swim' ? cssVar('--aqua-text', '#00687f') : cls === 'tread' ? cssVar('--sun', '#ff6a2a') : cssVar('--ink', '#1a1a1a');
      ctx.globalAlpha = 0.35 + 0.65 * q.readable; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 5.5 * k, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      if (selected && selected.clip === q.clip) { ctx.strokeStyle = cssVar('--ink', '#1a1a1a'); ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.arc(x, y, 8 * k, 0, Math.PI * 2); ctx.stroke(); }
      pts.push({ x, y, q });
    });
  });
  return (cssX, cssY) => { const x = cssX * k, y = cssY * k; let best = null, bd = 18 * k; for (const p of pts) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p.q; } } return best; };
}

if (typeof module !== 'undefined') module.exports = { BONES, drawSkeleton, drawTargetLine, drawLabel };

// ---- live dial: the body line drawn against the water line, like a protractor on the pool edge ----
// 0° is the water (horizontal, to the right), 90° straight up. Aqua wedge = flat zone (0..15), pale = acceptable (15..30).
// The needle is orange ink multiplied over the wedge, so inside the flat zone it prints green: the same overprint rule as every meter.
function drawDial(cv, angle, opts = {}) {
  const cssW = cv.clientWidth || 360;
  const { ctx, W, H, k } = fitCanvas(cv, opts.height || Math.round(Math.min(280, cssW * 0.62)));
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = cssVar('--paper-bright', '#fffdf7'); ctx.fillRect(0, 0, W, H);
  const pad = 16 * k, cx = pad + 10 * k, cy = H - pad - 10 * k, R = Math.min(W - cx - 64 * k, cy - pad - 18 * k);
  const rad = d => -d * Math.PI / 180;
  const wedge = (from, to, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, rad(from), rad(to), true); ctx.closePath(); ctx.fill(); };
  wedge(THRESHOLDS.bodyLine.great, THRESHOLDS.bodyLine.ok, cssVar('--aqua-pale', '#cfeaf1'));
  wedge(0, THRESHOLDS.bodyLine.great, cssVar('--aqua', '#00a6c8'));
  // protractor ticks every 15°, labels at 0 / 30 / 60 / 90
  ctx.strokeStyle = cssVar('--ink', '#1a1a1a'); ctx.fillStyle = cssVar('--ink-2', '#4f4b43'); ctx.font = `700 ${11 * k}px ${FONT_BODY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let d = 0; d <= 90; d += 15) { const a = rad(d), big = d % 30 === 0; ctx.lineWidth = (big ? 2 : 1) * k; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - (big ? 12 : 7) * k), cy + Math.sin(a) * (R - (big ? 12 : 7) * k)); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
    if (big && d > 0) ctx.fillText(d + '°', cx + Math.cos(a) * (R + 14 * k), cy + Math.sin(a) * (R + 14 * k)); }
  // the water line
  ctx.lineWidth = 3 * k; ctx.strokeStyle = cssVar('--ink', '#1a1a1a'); ctx.beginPath(); ctx.moveTo(cx - 8 * k, cy); ctx.lineTo(cx + R + 22 * k, cy); ctx.stroke();
  ctx.fillStyle = cssVar('--ink-2', '#4f4b43'); ctx.textAlign = 'left'; ctx.font = `700 ${10 * k}px ${FONT_BODY}`; ctx.fillText('WATER', cx + R + 26 * k, cy);
  if (angle !== null && angle !== undefined) {
    const a = rad(Math.max(0, Math.min(90, angle)));
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = cssVar('--sun', '#ff6a2a'); ctx.lineWidth = 7 * k; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92); ctx.stroke(); ctx.restore();
    ctx.fillStyle = cssVar('--ink', '#1a1a1a'); ctx.beginPath(); ctx.arc(cx, cy, 6 * k, 0, Math.PI * 2); ctx.fill();
  }
  // big number in the free corner
  ctx.fillStyle = cssVar('--ink', '#1a1a1a'); ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.font = `800 ${44 * k}px ${FONT_DISPLAY}`;
  ctx.fillText(angle === null || angle === undefined ? '–' : Math.round(angle) + '°', W - pad, pad);
  ctx.font = `700 ${11 * k}px ${FONT_BODY}`; ctx.fillStyle = cssVar('--ink-2', '#4f4b43'); ctx.fillText('BODY LINE', W - pad, pad + 48 * k);
}

// ---- compare two laps: lap A in orange, lap B in aqua, over the flat band; where the lines cross they print green ----
function drawCompareChart(cv, a, b) {
  const { ctx, W, H, k } = fitCanvas(cv, 170);
  const padL = 34 * k, padR = 10 * k, padT = 10 * k, padB = 22 * k;
  const tmax = Math.max((a.timeline || []).length / (a.fps || 8), (b.timeline || []).length / (b.fps || 8), 1);
  const xOf = t => padL + (W - padL - padR) * t / tmax, yOf = deg => padT + (H - padT - padB) * (1 - deg / 90);
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = cssVar('--paper-bright', '#fffdf7'); ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = cssVar('--aqua-pale', '#cfeaf1'); ctx.fillRect(padL, yOf(THRESHOLDS.bodyLine.great), W - padL - padR, yOf(0) - yOf(THRESHOLDS.bodyLine.great));
  ctx.strokeStyle = cssVar('--hair', 'rgba(26,26,26,.22)'); ctx.lineWidth = k; ctx.font = `${12 * k}px ${FONT_BODY}`; ctx.fillStyle = cssVar('--ink-2', '#4f4b43'); ctx.textBaseline = 'middle';
  for (const deg of [0, 30, 60, 90]) { const y = yOf(deg); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(deg + '°', padL - 6 * k, y); }
  ctx.textAlign = 'left'; for (let t = 0; t <= tmax; t += tmax > 12 ? 5 : 2) ctx.fillText(t + 's', xOf(t), H - padB / 2);
  const line = (s, col) => { const fps = s.fps || 8; ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = col; ctx.lineWidth = 3 * k; ctx.lineJoin = 'round'; ctx.beginPath(); let pen = false;
    (s.timeline || []).forEach((v, i) => { if (v === null) { pen = false; return; } const x = xOf(i / fps), y = yOf(v); if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y); pen = true; }); ctx.stroke(); ctx.restore(); };
  line(a, cssVar('--sun', '#ff6a2a')); line(b, cssVar('--aqua', '#00a6c8'));
}

// A square share card for the five water-safety skills: the stamp, the swimmer, five rules ticked or not.
function drawSafetyCard(swimmer, skills, SKILLS) {
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  const paper = '#f6f1e4', ink = '#1a1a1a', ink2 = '#4f4b43', aqua = '#00a6c8', sun = '#ff6a2a', over = '#004521';
  ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = aqua; ctx.fillRect(0, 0, W, 300); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = sun; ctx.fillRect(0, 200, W, 160); ctx.restore();
  ctx.fillStyle = paper; ctx.font = `800 120px ${FONT_DISPLAY}`; ctx.textBaseline = 'alphabetic'; ctx.fillText('WATER SAFE', 60, 180);
  ctx.fillStyle = ink; ctx.font = `700 40px ${FONT_BODY}`; ctx.fillText(`${swimmer ? swimmer.name : 'Swimmer'} · ${new Date().toLocaleDateString()}`, 60, 440);
  let y = 540; const done = SKILLS.filter(s => skills[s.key]).length;
  for (const s of SKILLS) {
    const e = skills[s.key];
    ctx.fillStyle = e ? over : paper; ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.fillRect(60, y - 44, 56, 56); ctx.strokeRect(60, y - 44, 56, 56);
    if (e) { ctx.strokeStyle = paper; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(74, y - 16); ctx.lineTo(86, y - 2); ctx.lineTo(106, y - 32); ctx.stroke(); }
    ctx.fillStyle = ink; ctx.font = `800 40px ${FONT_DISPLAY}`; ctx.fillText(s.name, 144, y);
    ctx.fillStyle = ink2; ctx.font = `400 28px ${FONT_BODY}`; ctx.fillText(e ? (e.how === 'app' ? `Verified by the camera: ${e.seconds} s at the surface, ${e.date}` : `Seen by a parent, ${e.date}`) : 'Not yet', 144, y + 40);
    y += 130;
  }
  ctx.fillStyle = ink; ctx.font = `800 60px ${FONT_DISPLAY}`; ctx.fillText(`${done} of ${SKILLS.length} skills`, 60, H - 140);
  ctx.fillStyle = ink2; ctx.font = `400 24px ${FONT_BODY}`; ctx.fillText('The five water-competency skills (American Red Cross). SafeDive Coach · not a safety device · an adult always watches the water', 60, H - 60);
  return cv;
}
