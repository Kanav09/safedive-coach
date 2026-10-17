// SafeDive Coach: screens, the analysis loop, results, progress. Everything else is a small module:
//   pose_yolo.js (model) -> metrics.js (keypoints to numbers) -> scoring.js (numbers to score + tips)
//   draw.js (canvas), drills.js (what to practise), examples.js (real frames), report.js (JSON + report card)

const $ = id => document.getElementById(id);
const STORE_KEY = 'safedive.sessions.v1', CONSENT_KEY = 'safedive.consent.v1', NAME_KEY = 'safedive.name';
const POSE_MODEL = 'models/yolo/yolo11n-pose.onnx', POSE_INPUT = 640;
const MAX_SECONDS = 30;                       // longest stretch of a clip we analyse

let detector = null, detectorLoading = null;
let cancelFlag = false;
let lastRun = null;                           // the most recent analysed lap (see analyze())
let scratch = null;                           // offscreen canvas for reading pixels
let studyClips = null;                        // assets/study_clips.json, loaded on first visit to About

// ---------- storage ----------
function loadSessions() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch (e) { return []; } }
function saveSessions(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* private mode: nothing persists, app still works */ } }
function getItem(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function setItem(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

// ---------- screens and tabs ----------
const TAB_OF = { home: 'home', examples: 'guide', guide: 'guide', analyze: 'home', results: 'home', drill: 'home', progress: 'progress', evidence: 'evidence', settings: 'evidence' };
function show(name, opts = {}) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  document.querySelectorAll('.tabs button').forEach(b => { const on = b.dataset.tab === TAB_OF[name]; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
  window.scrollTo(0, 0);
  // keyboard and screen-reader users land on the new screen's heading instead of staying on a button that just vanished
  if (opts.focus !== false) { const scr = $('screen-' + name), h = scr.querySelector('h1, h2') || scr; h.tabIndex = -1; h.focus({ preventScroll: true }); }
  if (name === 'home') refreshHome();
  if (name === 'progress') renderProgress();
  if (name === 'evidence') renderEvidence();
  if (name === 'settings') renderSettings();
  if (name === 'examples') buildExamples();
}

function refreshHome() {
  const s = loadSessions();
  $('statSessions').textContent = s.length;
  $('statStreak').textContent = weekStreak(s);
  $('statBest').textContent = s.length ? Math.max(...s.map(x => x.score)) : '–';
  $('levelPill').textContent = levelFor(s.length).name;
  $('swimmerName').value = getItem(NAME_KEY) || '';
  // the last scored lap as one overprint meter: orange score over the aqua strong-lap zone (80 and up)
  const last = s[s.length - 1], lap = $('lastLap');
  if (last) {
    const angle = last.torsoAngle === null || last.torsoAngle === undefined ? '' : ` · body line ${last.torsoAngle.toFixed(0)}° from flat`;
    $('lastLapText').innerHTML = `Last lap <b>${last.score}</b> · ${last.swimmer ? last.swimmer + ' · ' : ''}${new Date(last.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}${angle}`;
    $('lastLapFill').style.setProperty('--w', `${last.score}%`);
    lap.hidden = false;
  } else lap.hidden = true;
}
function showError(msg) { show('home'); const box = $('homeError'); box.textContent = msg; box.hidden = false; }
// Say something to screen readers without showing anything (the live region is visually hidden). Cleared first so a repeat is re-read.
function announce(msg) { const el = $('live'); el.textContent = ''; requestAnimationFrame(() => { el.textContent = msg; }); }

// ---------- pose model ----------
async function getDetector(note = () => {}) {
  if (detector) return detector;
  if (!detectorLoading) {
    note('Loading the pose model (first time only, about 12 MB)…');
    ort.env.wasm.wasmPaths = new URL('vendor/ort/', location.href).href;    // absolute: ort imports its .mjs/.wasm from here
    ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2); // only takes effect when the page is cross-origin isolated
    detectorLoading = new YoloPose(ort, POSE_MODEL, POSE_INPUT).load().then(d => (detector = d));
  }
  return detectorLoading;
}
// Pixel reader for anything drawable (video, img, canvas): draws it at the model's size and returns RGBA bytes.
function pixelsFrom(source) {
  return (nw, nh) => {
    if (!scratch) scratch = document.createElement('canvas');
    scratch.width = nw; scratch.height = nh;
    const c = scratch.getContext('2d', { willReadFrequently: true });
    c.drawImage(source, 0, 0, nw, nh);
    return c.getImageData(0, 0, nw, nh).data;
  };
}
async function poseOn(source, w, h) { const det = await getDetector(); return det.run(w, h, pixelsFrom(source)); }

// ---------- home hero: the model draws on the cover photo once it has loaded, quietly ----------
async function decorateHero() {
  const img = $('heroImg'), cv = $('heroCanvas');
  if (!img.complete) await new Promise(r => { img.onload = r; img.onerror = r; });
  if (!img.naturalWidth) return;
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  try {
    const poses = await poseOn(img, cv.width, cv.height);
    if (poses.length) { const ctx = cv.getContext('2d'); drawSkeleton(ctx, poses[0].keypoints, { scale: 2 }); cv.style.opacity = 1; }
  } catch (e) { /* the hero is decoration; never block the app on it */ }
}

// ---------- examples: run the model on a real frame, live ----------
let examplesBuilt = false;
function buildExamples() {
  if (examplesBuilt) return; examplesBuilt = true;
  const host = $('exampleList');
  for (const ex of EXAMPLES) {
    const card = document.createElement('article'); card.className = 'example';
    card.innerHTML = `<div class="pic"><img src="${ex.src}" alt="${ex.title}"><canvas style="opacity:0;transition:opacity .5s"></canvas></div>
      <div class="body"><h3>${ex.title}</h3><p>${ex.caption}</p><button class="btn secondary sm" type="button">Run the model on this frame</button><div class="result"></div></div>`;
    const img = card.querySelector('img'), cv = card.querySelector('canvas'), btn = card.querySelector('button'), out = card.querySelector('.result');
    img.addEventListener('load', () => { if (img.naturalHeight > img.naturalWidth) card.querySelector('.pic').classList.add('portrait'); });
    btn.onclick = async () => {
      btn.setAttribute('aria-busy', 'true'); btn.textContent = detector ? 'Reading…' : 'Loading the model (12 MB, once)…';
      try {
        if (!img.complete) await new Promise(r => { img.onload = r; });
        cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        const t0 = performance.now();
        const poses = await poseOn(img, cv.width, cv.height);
        const ms = Math.round(performance.now() - t0);
        const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height);
        let line;
        if (poses.length) {
          const kps = poses[0].keypoints, m = frameMetrics(kps);
          drawSkeleton(ctx, kps, { scale: Math.max(1.2, cv.width / 480), target: m && m.torsoAngle > THRESHOLDS.bodyLine.ok ? THRESHOLDS.bodyLine.great : null });
          line = m ? `<b>Found the swimmer: body ${m.torsoAngle.toFixed(0)}° from flat</b> (${ms} ms on this device).` : `<b>Found a person but not a readable torso.</b> Shoulders or hips are hidden, so this frame would not be scored (${ms} ms).`;
        } else line = `<b>No swimmer found in this frame</b> (${ms} ms). In a clip the app would skip it.`;
        cv.style.opacity = 1;
        out.innerHTML = `${line}<br><span class="fine">What we expect here: ${ex.expect}</span>`; out.classList.add('show');
        btn.textContent = 'Run again';
      } catch (e) { out.textContent = 'Could not run the model: ' + e.message; out.classList.add('show'); btn.textContent = 'Try again'; }
      btn.removeAttribute('aria-busy');
    };
    host.appendChild(card);
  }
}

// ---------- analysis ----------
function seekTo(video, t) {
  return new Promise(resolve => {
    const done = () => { clearTimeout(timer); video.onseeked = null; resolve(); };
    const timer = setTimeout(done, 2500);                 // never hang on a seek the browser drops
    video.onseeked = done; video.currentTime = t;
  });
}
function fmtEta(sec) { return sec < 1 ? 'almost' : sec < 60 ? `${Math.round(sec)} s` : `${Math.ceil(sec / 60)} min`; }

async function analyze(src, stroke, swimmer) {
  cancelFlag = false;
  show('analyze');
  const video = $('video'), canvas = $('overlay'), ctx = canvas.getContext('2d');
  const note = t => { $('analyzeNote').textContent = t; };
  $('bar').style.width = '0%'; $('readNow').textContent = '–'; $('readFrac').textContent = '0%'; $('readEta').textContent = '…';
  drawReadabilityStrip($('strip'), [], null, 1);
  const det = await getDetector(note);

  note('Opening the video…');
  video.src = src;
  await new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('This browser could not open that video. iPhone: Settings > Camera > Formats > Most Compatible, or share the clip as an MP4 and try again.')), 12000);
    video.onloadedmetadata = () => { clearTimeout(timer); res(); };
    video.onerror = () => { clearTimeout(timer); rej(new Error('Could not open that video.')); };
  });
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  const duration = Math.min(video.duration || 0, MAX_SECONDS);
  if (!duration) throw new Error('That video has no length. Try recording again.');

  // warm-up frame decides the sampling rate: fast devices get 8 frames a second, slow ones 4, so nobody waits minutes
  await seekTo(video, 0);
  let t0 = performance.now(); await det.run(video.videoWidth, video.videoHeight, pixelsFrom(video));
  const warmMs = performance.now() - t0;
  const fps = warmMs > 450 ? 4 : 8;
  const total = Math.floor(duration * fps);
  const perFrame = [], keypoints = [], times = [];
  let best = null, spent = 0;

  note(`Reading the swimmer, ${fps} frames a second…`);
  for (let i = 0; i < total; i++) {
    if (cancelFlag) return null;
    const t = i / fps;
    await seekTo(video, t);
    t0 = performance.now();
    const poses = await det.run(video.videoWidth, video.videoHeight, pixelsFrom(video));
    spent += performance.now() - t0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let m = null, kps = null;
    if (poses.length) {
      kps = poses[0].keypoints; m = frameMetrics(kps);
      drawSkeleton(ctx, kps); drawLabel(ctx, m ? `body ${m.torsoAngle.toFixed(0)}° from flat` : 'torso not readable');
      const conf = kps.reduce((a, k) => a + k.score, 0);
      if (m && (!best || conf > best.conf)) {
        const snap = document.createElement('canvas'); snap.width = canvas.width; snap.height = canvas.height;
        const sctx = snap.getContext('2d'); sctx.drawImage(video, 0, 0); drawSkeleton(sctx, kps);
        best = { conf, snap, index: i };
      }
    }
    perFrame.push(m); keypoints.push(kps); times.push(t);
    $('readNow').textContent = m ? `${m.torsoAngle.toFixed(0)}°` : (kps ? 'hidden' : 'none');
    $('readFrac').textContent = `${Math.round(100 * perFrame.filter(Boolean).length / perFrame.length)}%`;
    $('readEta').textContent = fmtEta((total - i - 1) * (spent / (i + 1)) / 1000);
    const pct = Math.round(100 * (i + 1) / total);
    $('bar').style.width = `${pct}%`; $('progressBar').setAttribute('aria-valuenow', pct);
    drawReadabilityStrip($('strip'), perFrame, null, total);
  }
  const summary = clipSummary(perFrame, fps);
  const result = scoreClip(summary, stroke, fps);
  const moving = markMoving(perFrame, fps);
  lastRun = { summary, result, perFrame, keypoints, times, moving, best, stroke, swimmer, src, fps, date: new Date().toISOString() };
  if (result.ok) {
    const s = loadSessions();
    s.push({ date: lastRun.date, swimmer, stroke, score: result.score, torsoAngle: summary.torsoAngle, readable: summary.readableFrac, issues: result.issues });
    saveSessions(s);
  }
  show('results');                 // charts need their real width, so the screen is shown before drawing
  renderResults();
  announce(result.ok ? `Lap scored ${result.score}. ${scoreWord(result.score)}.` : `Not scored. ${result.reason}`);
  return lastRun;
}

// ---------- results ----------
let chartHit = null;
function renderResults() {
  const { summary, result, perFrame, times, moving, best, stroke, swimmer, fps } = lastRun;
  $('resHeader').textContent = `${swimmer ? swimmer + ' · ' : ''}${STROKES[stroke] || stroke} · ${new Date(lastRun.date).toLocaleDateString()}`;
  const scoreEl = $('resScore'), refuse = $('resRefuse'), parts = $('resParts'), tips = $('resTips');
  if (!result.ok) {
    scoreEl.hidden = true; parts.innerHTML = ''; tips.innerHTML = '';
    refuse.hidden = false;
    refuse.innerHTML = `<b>Not scored.</b> ${result.reason}<br><span class="fine">Body readable in ${Math.round(summary.readableFrac * 100)}% of frames, travelling in ${Math.round(summary.movingFrac * 100)}%. The app refuses to guess rather than give a number it cannot stand behind. <a href="#" data-go="guide">How to film</a>.</span>`;
    $('btnSaveCard').disabled = false; $('btnCopyJson').disabled = false;
  } else {
    refuse.hidden = true; scoreEl.hidden = false;
    const cls = result.score >= 80 ? 'good' : result.score >= 55 ? 'warn' : 'bad';
    scoreEl.innerHTML = `<div class="num ${cls}">${result.score}</div><div><div class="word">${scoreWord(result.score)}</div><div class="conf">Body readable in ${Math.round(summary.readableFrac * 100)}% of frames · ${(summary.scoredFrames / fps).toFixed(1)} s of swimming scored</div></div>`;
    parts.innerHTML = result.parts.map(p => { const f = p.pts / p.max, fill = f >= 0.8 ? 'var(--good)' : f >= 0.5 ? 'var(--warn)' : 'var(--bad)';
      return `<div class="part"><span class="name">${p.name}</span><span class="pts">${p.pts}<span class="fine">/${p.max}</span></span><span class="val">${p.value}</span><span class="meter"><i style="--w:${Math.round(f * 100)}%;--fill:${fill}"></i></span></div>`; }).join('');
    // one tip, one drill: the first tip that has a drill leads, full size; the rest follow smaller
    let lead = false;
    tips.innerHTML = result.tips.map((t, i) => { const d = drillFor(result.issues[i]); const cls = d ? (lead ? 'fix' : 'fix lead') : 'ok'; if (d) lead = true;
      return `<li class="${cls}"><span>${t}</span>${d ? `<button class="btn secondary sm" type="button" data-drill="${result.issues[i]}">Drill: ${d.name}</button>` : ''}</li>`; }).join('');
    tips.querySelectorAll('[data-drill]').forEach(b => b.onclick = () => openDrill(b.dataset.drill));
  }
  // frame stepper
  const scrub = $('scrub'); scrub.max = Math.max(times.length - 1, 0); scrub.value = best ? best.index : 0;
  drawResultFrame(+scrub.value);
  chartHit = drawAngleChart($('angleChart'), perFrame, times, moving, +scrub.value);
}

async function drawResultFrame(i) {
  const { keypoints, perFrame, times, moving, best, src } = lastRun;
  const cv = $('resultCanvas'), video = $('video'), ctx = cv.getContext('2d');
  cv.width = video.videoWidth || (best && best.snap.width) || 640; cv.height = video.videoHeight || (best && best.snap.height) || 360;
  let drewVideo = false;
  if (video.videoWidth && video.src === src) { await seekTo(video, times[i]); try { ctx.drawImage(video, 0, 0); drewVideo = true; } catch (e) {} }
  if (!drewVideo && best) ctx.drawImage(best.snap, 0, 0);
  const kps = keypoints[i], m = perFrame[i];
  if (kps) drawSkeleton(ctx, kps, { target: $('targetToggle').checked && m ? THRESHOLDS.bodyLine.great : null });
  const state = !kps ? 'no swimmer found' : !m ? 'torso not readable' : moving[i] ? `body ${m.torsoAngle.toFixed(0)}° · travelling, scored` : `body ${m.torsoAngle.toFixed(0)}° · still, not scored`;
  drawLabel(ctx, `${times[i].toFixed(1)} s · ${state}`);
  $('scrubReadout').textContent = `Frame ${i + 1} of ${times.length} · ${state}`;
  $('scrub').setAttribute('aria-valuetext', `Frame ${i + 1} of ${times.length}, ${state}`);
  if (!drewVideo && !best) { ctx.fillStyle = '#0a1a26'; ctx.fillRect(0, 0, cv.width, cv.height); drawLabel(ctx, 'No readable frame to show'); }
}

function openDrill(key) {
  const d = DRILLS[key]; if (!d) return;
  $('drillTitle').textContent = 'Drill: ' + d.name; $('drillWhy').textContent = d.why;
  $('drillSteps').innerHTML = d.steps.map(s => `<li>${s}</li>`).join(''); $('drillReps').textContent = 'How much: ' + d.reps;
  show('drill');
}

async function saveReportCard() {
  const card = makeReportCard(lastRun, lastRun.fps);
  const name = `safedive-${(lastRun.swimmer || 'lap').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'lap'}-${lastRun.date.slice(0, 10)}.png`;
  const blob = await new Promise(r => card.toBlob(r, 'image/png'));
  const file = new File([blob], name, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'SafeDive Coach report card' }); announce('Report card shared'); return; } catch (e) { /* user closed the sheet: fall through to download */ } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  announce('Report card saved as ' + name);
}
async function copyJson(btn) {
  const text = JSON.stringify(resultToJSON(lastRun, lastRun.fps), null, 2);
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
  catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); btn.textContent = 'Copied'; }
  announce('Copied the result as JSON');
  setTimeout(() => { btn.textContent = 'Copy as JSON'; }, 1800);
}

// ---------- progress ----------
let progressFilter = null, progressSelected = -1, historyHit = null;
function renderProgress() {
  const all = loadSessions();
  const names = [...new Set(all.map(s => s.swimmer).filter(Boolean))];
  const chips = $('chipRow'); chips.innerHTML = '';
  if (names.length > 1) {
    for (const n of [null, ...names]) { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (progressFilter === n ? ' on' : ''); b.setAttribute('aria-pressed', progressFilter === n); b.textContent = n || 'Everyone'; b.onclick = () => { progressFilter = n; progressSelected = -1; renderProgress(); }; chips.appendChild(b); }
  } else progressFilter = null;
  const s = progressFilter ? all.filter(x => x.swimmer === progressFilter) : all;
  const lvl = levelFor(all.length), needs = [0, 3, 8, 15, 25];
  $('levelName').textContent = lvl.name;
  $('levelNext').textContent = lvl.toNext === null ? 'Top level. Keep the streak going.' : `${lvl.toNext} more scored ${lvl.toNext === 1 ? 'lap' : 'laps'} to ${['Minnow', 'Otter', 'Dolphin', 'Shark'][lvl.index]}. Week streak: ${weekStreak(all)}.`;
  const span = lvl.toNext === null ? 1 : (needs[lvl.index + 1] - needs[lvl.index]);
  const frac = lvl.toNext === null ? 1 : (all.length - needs[lvl.index]) / span;
  const levelPct = Math.round(100 * Math.max(0, Math.min(1, frac)));
  $('levelFill').style.setProperty('--w', `${levelPct}%`); $('levelMeter').setAttribute('aria-valuenow', levelPct);
  const last = s.slice(-12);
  historyHit = drawHistoryChart($('historyChart'), last, progressSelected >= 0 ? progressSelected - (s.length - last.length) : -1);
  const detail = $('sessionDetail');
  if (progressSelected >= 0 && s[progressSelected]) {
    const x = s[progressSelected];
    detail.hidden = false;
    detail.innerHTML = `<b>${new Date(x.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</b> · ${x.swimmer || 'no name'} · ${STROKES[x.stroke] || x.stroke}<br>Score ${x.score} (${scoreWord(x.score)}). Body line ${x.torsoAngle === null || x.torsoAngle === undefined ? '–' : x.torsoAngle.toFixed(0) + '°'} from flat, readable in ${Math.round((x.readable || 0) * 100)}% of frames.${x.issues ? '<br><span class="fine">Worked on: ' + x.issues.filter(k => !NO_DRILL.has(k)).map(k => DRILLS[k] ? DRILLS[k].name : k).join(', ') + '</span>' : ''}`;
    if (x.issues) { const drill = x.issues.find(k => !NO_DRILL.has(k)); if (drill) detail.innerHTML += ` <a href="#" data-drill="${drill}">Open the drill</a>`; detail.querySelectorAll('[data-drill]').forEach(a => a.onclick = ev => { ev.preventDefault(); openDrill(a.dataset.drill); }); }
  } else detail.hidden = true;
  $('historyList').innerHTML = s.map((x, i) => `<button type="button" class="hist${i === progressSelected ? ' on' : ''}" data-i="${i}" aria-pressed="${i === progressSelected}"><div>${new Date(x.date).toLocaleDateString()} · ${x.swimmer || ''} <span>${STROKES[x.stroke] || x.stroke}</span></div><b>${x.score}</b></button>`).reverse().join('')
    || '<div class="empty"><b>No laps scored yet</b><p>Film one lap from the side of the pool and the score shows up here.</p><button class="btn secondary" type="button" data-go="home">Score a lap</button></div>';
  $('historyList').querySelectorAll('.hist').forEach(el => el.onclick = () => { progressSelected = +el.dataset.i; renderProgress(); });
}

// ---------- evidence ----------
let studySelected = null, studyHit = null;
async function renderEvidence() {
  if (!studyClips) { try { studyClips = await (await fetch('assets/study_clips.json')).json(); } catch (e) { studyClips = []; } }
  studyHit = drawStudyChart($('studyChart'), studyClips, studySelected);
  if (studySelected) {
    const q = studySelected, kind = { swim: 'swimming', tread: 'treading water', distress: 'acted struggling' }[q.cls];
    $('studyDetail').innerHTML = `<b>Clip ${q.clip}</b>, ${kind}, ${q.secs} s. Median body angle ${q.angle}°, torso readable in ${Math.round(q.readable * 100)}% of frames. ${q.cls === 'swim' && q.angle > 60 ? 'This "swimming" clip reads vertical because the swimmer was standing at the wall for most of it, exactly the frames the app now ignores.' : ''}`;
  }
}

// ---------- settings ----------
function renderSettings() {
  const s = loadSessions();
  $('dataSummary').textContent = s.length ? `${s.length} scored ${s.length === 1 ? 'lap' : 'laps'} stored on this device, the first on ${new Date(s[0].date).toLocaleDateString()}. Each one is a date, a name if you typed one, the stroke and the scores.` : 'Nothing stored yet.';
  $('versionTag').textContent = APP_VERSION;
}

// ---------- wiring ----------
window.addEventListener('DOMContentLoaded', () => {
  refreshHome();
  // consent sheet on first run
  const setModal = on => { $('app').inert = on; document.querySelector('.tabs').inert = on; document.querySelector('.top').inert = on; };
  if (!getItem(CONSENT_KEY)) { $('consentSheet').hidden = false; setModal(true); $('consentTitle').focus({ preventScroll: true }); }
  $('consentCheck').onchange = e => { $('btnConsent').disabled = !e.target.checked; };
  $('btnConsent').onclick = () => { setItem(CONSENT_KEY, new Date().toISOString()); $('consentSheet').hidden = true; setModal(false); $('btnPick').focus(); };

  $('btnPick').onclick = () => $('fileInput').click();
  $('fileInput').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    $('homeError').hidden = true;
    const name = $('swimmerName').value.trim(); setItem(NAME_KEY, name);
    try { await analyze(URL.createObjectURL(f), $('strokeSelect').value, name); }
    catch (err) { console.error('SafeDive', err); showError(err.message); }
    e.target.value = '';
  };
  $('btnExamples').onclick = () => show('examples');
  $('btnCancel').onclick = () => { cancelFlag = true; show('home'); };
  $('btnAgain').onclick = () => show('home');
  $('btnDrillBack').onclick = () => show('results');
  $('btnSaveCard').onclick = saveReportCard;
  $('btnCopyJson').onclick = e => copyJson(e.currentTarget);
  $('levelPill').onclick = () => show('progress');
  $('btnClear').onclick = () => { if (confirm('Delete all scored laps on this device? This cannot be undone.')) { saveSessions([]); progressSelected = -1; renderSettings(); refreshHome(); announce('All scored laps deleted'); } };
  const tabButtons = [...document.querySelectorAll('.tabs button')];
  tabButtons.forEach(b => b.onclick = () => show(b.dataset.tab));
  // arrow keys move between tabs, the way a native tab strip does
  document.querySelector('.tabs').addEventListener('keydown', e => {
    const i = tabButtons.indexOf(document.activeElement); if (i < 0) return;
    const j = e.key === 'ArrowRight' ? (i + 1) % tabButtons.length : e.key === 'ArrowLeft' ? (i + tabButtons.length - 1) % tabButtons.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabButtons.length - 1 : -1;
    if (j < 0) return; e.preventDefault(); show(tabButtons[j].dataset.tab, { focus: false }); tabButtons[j].focus();
  });
  document.body.addEventListener('click', e => { const go = e.target.closest('[data-go]'); if (go) { e.preventDefault(); show(go.dataset.go); } });

  // results interactions
  $('scrub').oninput = e => { const i = +e.target.value; drawResultFrame(i); chartHit = drawAngleChart($('angleChart'), lastRun.perFrame, lastRun.times, lastRun.moving, i); };
  $('targetToggle').onchange = () => drawResultFrame(+$('scrub').value);
  $('angleChart').onclick = e => { if (!chartHit) return; const r = e.currentTarget.getBoundingClientRect(); const i = chartHit(e.clientX - r.left); $('scrub').value = i; $('scrub').oninput({ target: $('scrub') }); };
  $('historyChart').onclick = e => { if (!historyHit) return; const r = e.currentTarget.getBoundingClientRect(); const i = historyHit(e.clientX - r.left); if (i >= 0) { const all = loadSessions(); const s = progressFilter ? all.filter(x => x.swimmer === progressFilter) : all; progressSelected = s.length - Math.min(12, s.length) + i; renderProgress(); } };
  $('studyChart').onclick = e => { if (!studyHit) return; const r = e.currentTarget.getBoundingClientRect(); const q = studyHit(e.clientX - r.left, e.clientY - r.top); if (q) { studySelected = q; renderEvidence(); } };
  let resizeTimer; window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { const on = document.querySelector('.screen.active').id.replace('screen-', ''); if (on === 'results' && lastRun) renderResults(); if (on === 'progress') renderProgress(); if (on === 'evidence') renderEvidence(); }, 150); });

  // the cover photo gets its skeleton once the browser is idle, so the first paint is instant
  const idle = window.requestIdleCallback || (f => setTimeout(f, 1500));
  idle(() => decorateHero());

  const q = new URLSearchParams(location.search);
  // ?screen=name opens a screen directly (demos, screenshots); ?sample=path runs a clip without the file picker
  if (q.get('screen')) show(q.get('screen'), { focus: false });
  if (q.get('sample')) analyze(q.get('sample'), q.get('stroke') || 'freestyle', q.get('name') || '').catch(err => { console.error('SafeDive', err); showError(err.message); });
  window.SafeDive = { analyze, show, lastRun: () => lastRun, loadSessions, saveSessions };
});
