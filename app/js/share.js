// SafeDive Coach: a scored lap as a link, with no server. The result is packed into the URL fragment (#lap=...),
// which browsers never send to any server, so sharing with a coach keeps the no-upload promise.
// Only numbers go in: score, parts, body angle, tips, and the body-angle line downsampled to about 60 points.

function packLap(run, fps) {
  const { summary, result, perFrame, times, moving, stroke, swimmer, date } = run;
  const n = perFrame.length, step = Math.max(1, Math.ceil(n / 60));
  const line = [];
  for (let i = 0; i < n; i += step) { const m = perFrame[i]; line.push([+times[i].toFixed(1), m ? Math.round(m.torsoAngle) : null, moving[i] ? 1 : 0]); }
  const o = {
    v: 1, d: date || new Date().toISOString(), n: swimmer || '', st: stroke,
    r: +summary.readableFrac.toFixed(2), s: summary.scoredFrames / fps,
    ok: result.ok ? 1 : 0, sc: result.ok ? result.score : null, why: result.ok ? null : result.reason,
    p: result.ok ? result.parts.map(p => [p.key, p.pts, p.max, p.value]) : [],
    t: result.ok ? result.tips : [], is: result.ok ? result.issues : [],
    a: summary.torsoAngle === null ? null : Math.round(summary.torsoAngle), l: line,
  };
  return toB64(JSON.stringify(o));
}

// Reverse of packLap: a run-like object the results screen can draw (no video, no keypoints).
function unpackLap(b64) {
  const o = JSON.parse(fromB64(b64));
  if (o.v !== 1) throw new Error('unknown link version');
  const perFrame = o.l.map(([, a]) => a === null ? null : { torsoAngle: a }), times = o.l.map(([t]) => t), moving = o.l.map(([, , m]) => !!m);
  const result = o.ok ? { ok: true, score: o.sc, parts: o.p.map(([key, pts, max, value]) => ({ key, pts, max, value, name: { body: 'Body line', head: 'Head position', rhythm: 'Stroke rhythm' }[key] || key })), tips: o.t, issues: o.is } : { ok: false, reason: o.why };
  const summary = { readableFrac: o.r, scoredFrames: o.s, torsoAngle: o.a, movingFrac: moving.filter(Boolean).length / Math.max(moving.length, 1) };
  return { shared: true, summary, result, perFrame, times, moving, best: null, stroke: o.st, swimmer: o.n, date: o.d, fps: 1, keypoints: perFrame.map(() => null) };
}

// base64url without padding, so the link has no characters that need escaping
function toB64(s) { const b = typeof Buffer !== 'undefined' ? Buffer.from(s, 'utf8').toString('base64') : btoa(unescape(encodeURIComponent(s))); return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function fromB64(b) { const s = b.replace(/-/g, '+').replace(/_/g, '/'); return typeof Buffer !== 'undefined' ? Buffer.from(s, 'base64').toString('utf8') : decodeURIComponent(escape(atob(s))); }

if (typeof module !== 'undefined') module.exports = { packLap, unpackLap };
