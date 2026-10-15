// SafeDive Coach: turns one analysed lap into (a) a plain JSON record and (b) a report-card image.
// The JSON shape is documented in docs/ANALYSIS_SCHEMA.md and checked by test/report.test.js.

const APP_VERSION = '0.2.0';

function resultToJSON(run, sampleFps) {
  const { summary, result, perFrame, times, stroke, swimmer } = run;
  const moving = markMoving(perFrame, sampleFps);
  return {
    app: 'SafeDive Coach', version: APP_VERSION, created: new Date().toISOString(),
    swimmer: swimmer || null, stroke,
    clip: { seconds: +summary.seconds.toFixed(2), framesAnalysed: summary.frames, sampleFps },
    readability: { readableFrac: +summary.readableFrac.toFixed(3), movingFrac: +summary.movingFrac.toFixed(3), scoredSeconds: +(summary.scoredFrames / sampleFps).toFixed(2) },
    metrics: {
      torsoAngleDeg: summary.torsoAngle === null ? null : +summary.torsoAngle.toFixed(1),
      headLift: summary.headLift === null ? null : +summary.headLift.toFixed(3),
      strokeRateSpm: summary.strokeHz === null ? null : Math.round(summary.strokeHz * 60),
    },
    score: result.ok ? { total: result.score, word: scoreWord(result.score), parts: result.parts.map(p => ({ key: p.key, name: p.name, points: p.pts, max: p.max, value: p.value })) } : null,
    issues: result.ok ? result.issues : [],
    tips: result.ok ? result.tips : [],
    refused: result.ok ? null : { reason: result.reason },
    timeline: perFrame.map((m, i) => ({ t: +times[i].toFixed(3), angle: m ? +m.torsoAngle.toFixed(1) : null, moving: !!moving[i] })),
  };
}

// A 1080x1350 (4:5) picture a parent can keep or send: photo with skeleton, score, the three parts, the first tip.
function makeReportCard(run, sampleFps) {
  const { result, summary, best, stroke, swimmer } = run;
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const navy = '#0e4a70', paper = '#fffdf8', ink = '#10202b', muted = '#5d6b75', rope = '#d8432f';
  ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
  // photo
  const photoH = 640;
  if (best) {
    const s = Math.max(W / best.snap.width, photoH / best.snap.height);
    const dw = best.snap.width * s, dh = best.snap.height * s;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, photoH); ctx.clip();
    ctx.drawImage(best.snap, (W - dw) / 2, (photoH - dh) / 2, dw, dh); ctx.restore();
  } else { ctx.fillStyle = navy; ctx.fillRect(0, 0, W, photoH); }
  // lane rope
  const g = ctx.createLinearGradient(0, 0, W, 0);
  for (let i = 0; i <= 36; i++) g.addColorStop(i / 36, i % 2 ? '#ffffff' : (Math.floor(i / 2) % 2 ? rope : navy));
  ctx.fillStyle = g; ctx.fillRect(0, photoH, W, 10);
  const condensed = '"Avenir Next Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';
  const body = '"Avenir Next", "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = muted; ctx.font = `500 30px ${body}`; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${swimmer ? swimmer + '  ·  ' : ''}${STROKES[stroke] || stroke}  ·  ${new Date().toLocaleDateString()}`, 60, photoH + 70);
  if (result.ok) {
    ctx.fillStyle = ink; ctx.font = `700 220px ${condensed}`; ctx.fillText(String(result.score), 54, photoH + 290);
    ctx.font = `600 46px ${condensed}`; ctx.fillStyle = navy; ctx.fillText(scoreWord(result.score).toUpperCase(), 400, photoH + 200);
    ctx.font = `400 28px ${body}`; ctx.fillStyle = muted; ctx.fillText(`body readable in ${Math.round(summary.readableFrac * 100)}% of frames`, 400, photoH + 250);
    let y = photoH + 360;
    for (const p of result.parts) {
      ctx.fillStyle = ink; ctx.font = `600 32px ${body}`; ctx.fillText(p.name, 60, y);
      ctx.fillStyle = muted; ctx.font = `400 26px ${body}`; ctx.fillText(p.value, 60, y + 36);
      ctx.fillStyle = '#e6e1d7'; ctx.fillRect(620, y - 22, 400, 18);
      ctx.fillStyle = p.pts / p.max >= 0.8 ? '#1f8a5b' : p.pts / p.max >= 0.5 ? '#c7811a' : '#c2362b'; ctx.fillRect(620, y - 22, 400 * p.pts / p.max, 18);
      ctx.fillStyle = ink; ctx.font = `700 30px ${condensed}`; ctx.textAlign = 'right'; ctx.fillText(`${p.pts}/${p.max}`, 1020, y + 36); ctx.textAlign = 'left';
      y += 100;
    }
    const tip = result.tips.find((t, i) => !NO_DRILL.has(result.issues[i])) || result.tips[0];
    ctx.fillStyle = rope; ctx.font = `700 30px ${condensed}`; ctx.fillText('ONE THING TO FIX', 60, y + 20);
    ctx.fillStyle = ink; ctx.font = `400 30px ${body}`; wrapText(ctx, tip, 60, y + 66, 960, 40);
  } else {
    ctx.fillStyle = ink; ctx.font = `700 70px ${condensed}`; ctx.fillText('NOT SCORED', 60, photoH + 180);
    ctx.font = `400 30px ${body}`; wrapText(ctx, result.reason, 60, photoH + 250, 960, 42);
  }
  ctx.fillStyle = muted; ctx.font = `400 24px ${body}`; ctx.fillText('SafeDive Coach  ·  scored on the phone, nothing uploaded  ·  not a safety device', 60, H - 40);
  return cv;
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = String(text).split(' '); let line = '';
  for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lineH; } else line = test; }
  if (line) ctx.fillText(line, x, y);
}

if (typeof module !== 'undefined') module.exports = { APP_VERSION, resultToJSON };
