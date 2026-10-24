// SafeDive Coach: screens and wiring. Everything else is a small module with one job:
//   pose_yolo.js (model) -> metrics.js (keypoints to numbers) -> scoring.js (numbers to score + tips)
//   draw.js (canvas), drills.js (what to practise), examples.js (real frames), report.js (JSON + report card)
//   store.js (what is kept on the device), badges.js, safety.js (water-safety skills + float test),
//   plan.js (one-week plan + calendar), share.js (a lap as a link), live.js (camera, dial, cues)

const $ = id => document.getElementById(id);
// Two pose models, same code path (js/pose_yolo.js). 'fast' ships with the app and runs the live coach. 'careful' is the
// bigger YOLO11s-pose: in the 87-clip study it read 16 of 41 swimming clips more than 5 points better and treading water
// much better, at twice the time (feasibility/v04/RESULTS.md). It is fetched once, on demand, when a parent asks for it.
const POSE_MODELS = { fast: { url: 'models/yolo/yolo11n-pose.onnx', label: 'fast model', mb: 12 }, careful: { url: 'models/yolo/yolo11s-pose.onnx', label: 'careful model', mb: 40 } };
const POSE_INPUT = 640;
const MAX_SECONDS = 30;                       // longest stretch of a lap clip we analyse
const FLOAT_MAX_SECONDS = 95;                 // the float test needs a full minute plus slack
const SAMPLE = { src: 'samples/normal_swimming_IMG_0389.mp4', stroke: 'backstroke' };   // our own backstroke lap: the one bundled clip the rules score (90), so anyone can see the app work without filming
const store = makeStore();
store.migrate();

const detectors = {}, detectorLoading = {};     // one loaded YoloPose per model key
let detector = null;                             // the fast one, once loaded (the examples screen and the hero use it)
let cancelFlag = false;
let lastRun = null;                           // the most recent analysed lap (see analyze())
let scratch = null;                           // offscreen canvas for reading pixels
let studyClips = null;                        // assets/study_clips.json, loaded on first visit to About
let live = null, liveTest = null;             // LiveCoach instance; liveTest = { seconds } while a float test runs
let currentDrillKey = null;
let deferredInstall = null;

const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// a bare YYYY-MM-DD is a calendar day, not a UTC instant: parse it as local so Oct 17 never prints as Oct 16
const asDate = d => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) ? new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) : new Date(d);
const fmtDate = (d, o) => asDate(d).toLocaleDateString(undefined, o || { month: 'short', day: 'numeric' });

// ---------- screens and tabs ----------
const TAB_OF = { home: 'home', analyze: 'home', results: 'home', drill: 'home', live: 'live', safety: 'safety', floatresult: 'safety', progress: 'progress', compare: 'progress', guide: 'guide', examples: 'guide', evidence: 'guide', settings: 'guide' };
function show(name, opts = {}) {
  if (live && live.running && name !== 'live') stopLive();
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  document.querySelectorAll('.tabs button').forEach(b => { const on = b.dataset.tab === TAB_OF[name]; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
  window.scrollTo(0, 0);
  // keyboard and screen-reader users land on the new screen's heading instead of staying on a button that just vanished
  if (opts.focus !== false) { const scr = $('screen-' + name), h = scr.querySelector('h1, h2') || scr; h.tabIndex = -1; h.focus({ preventScroll: true }); }
  if (name === 'home') refreshHome();
  if (name === 'live') prepareLive(opts.test || null);
  if (name === 'safety') renderSafety();
  if (name === 'progress') renderProgress();
  if (name === 'compare') renderCompare();
  if (name === 'evidence') renderEvidence();
  if (name === 'settings') renderSettings();
  if (name === 'examples') buildExamples();
}
// Say something to screen readers without showing anything (the live region is visually hidden). Cleared first so a repeat is re-read.
function announce(msg) { const el = $('live'); el.textContent = ''; requestAnimationFrame(() => { el.textContent = msg; }); }
// A short visible note at the bottom of the screen, like a toast, that also reaches screen readers.
let toastTimer = null;
function tick(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; t.classList.add('show'); announce(msg); clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.classList.remove('show'); setTimeout(() => { t.hidden = true; }, 200); }, 3200); }
function showError(msg) { show('home'); const box = $('homeError'); box.textContent = msg; box.hidden = false; }

// ---------- swimmers ----------
function activeSwimmer() { return store.currentSwimmer(); }
function renderSwimmerRows() { ['swimRowHome', 'swimRowSafety', 'swimRowProgress'].forEach(id => renderSwimmerRow($(id))); }
function renderSwimmerRow(host) {
  if (!host) return;
  const list = store.swimmers(), cur = activeSwimmer();
  host.innerHTML = list.map(s => `<button type="button" class="stamp ink${s.ink}${cur && cur.id === s.id ? ' on' : ''}" data-id="${s.id}" aria-pressed="${!!(cur && cur.id === s.id)}"><b>${esc(s.name[0].toUpperCase())}</b><span>${esc(s.name)}</span></button>`).join('')
    + `<button type="button" class="stamp add" data-add-swimmer><b>+</b><span>${list.length ? 'Add' : 'Add swimmer'}</span></button>`;
  host.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { store.setCurrentSwimmer(b.dataset.id); refreshAll(); });
}
function openAddSwimmer() { show('home'); $('addSwimmerForm').hidden = false; $('addSwimmerName').value = ''; $('addSwimmerName').focus(); }
function refreshAll() {
  renderSwimmerRows();
  const on = document.querySelector('.screen.active').id.replace('screen-', '');
  if (on === 'home') refreshHome(); if (on === 'safety') renderSafety(); if (on === 'progress') renderProgress();
}
function badgesFor(swimmerId) {
  const plan = store.plan();
  return earnedBadges({ sessions: store.sessionsFor(swimmerId), skills: swimmerId ? store.skillsFor(swimmerId) : {}, plan: plan && (!swimmerId || plan.swimmerId === swimmerId) ? plan : null });
}
// Run a change that may earn a badge, and say so if it did.
function withBadges(swimmerId, change) {
  const before = badgesFor(swimmerId); change(); const after = badgesFor(swimmerId);
  const fresh = after.filter(k => !before.includes(k));
  if (fresh.length) { const b = BADGES.find(x => x.key === fresh[0]); setTimeout(() => { toast(`New badge: ${b.name}${fresh.length > 1 ? ` and ${fresh.length - 1} more` : ''}`); tick([10, 40, 10]); }, 600); }
}

// ---------- home ----------
function refreshHome() {
  const sw = activeSwimmer(), s = store.sessionsFor(sw ? sw.id : null);
  $('swimmerHint').textContent = sw ? '' : (store.swimmers().length ? 'Tap a name' : 'Laps and skills are kept per child');
  $('statSessions').textContent = s.length;
  document.querySelector('#screen-home .stats').hidden = s.length === 0;   // three zeros teach nothing; the strip appears with the first lap
  const anyLap = store.sessions().length > 0, sample = $('btnSample');   // first run: seeing it work matters more than the live coach
  sample.className = anyLap ? 'btn ghost sm' : 'btn secondary'; sample.lastChild.textContent = anyLap ? 'No clip yet? Try our sample lap' : 'See it work on our sample lap';
  $('statStreak').textContent = weekStreak(s);
  $('statBest').textContent = s.length ? Math.max(...s.map(x => x.score)) : '–';
  $('levelPill').textContent = levelFor(s.length).name;
  const last = s[s.length - 1], prev = s[s.length - 2], lap = $('lastLap');
  if (last) {
    const angle = last.torsoAngle === null || last.torsoAngle === undefined ? '' : ` · body ${last.torsoAngle.toFixed(0)}° from flat`;
    const d = prev ? last.score - prev.score : null;
    const trend = d === null ? 'first scored lap' : d > 0 ? `up ${d} on the lap before` : d < 0 ? `down ${-d} on the lap before` : 'same as the lap before';
    $('lastLapNum').textContent = last.score;
    $('lastLapNum').className = 'lapnum ' + (last.score >= 80 ? 'good' : last.score >= 55 ? 'warn' : 'bad');
    $('lastLapTitle').textContent = `Last lap: ${scoreWord(last.score).toLowerCase()}`;
    $('lastLapText').textContent = `${last.swimmer ? last.swimmer + ' · ' : ''}${fmtDate(last.date)}${angle} · ${trend}`;
    $('lastLapFill').style.setProperty('--w', `${last.score}%`);
    lap.hidden = false;
  } else lap.hidden = true;
  // safety line
  const done = sw ? skillsDone(store.skillsFor(sw.id)) : 0;
  $('safetyLineText').textContent = sw ? (done === SKILLS.length ? `${sw.name} has all five skills signed off.` : `${sw.name}: ${done} of ${SKILLS.length} skills signed off.`) : 'Five skills, signed off by you or checked by the camera.';
  $('safetyFill').style.setProperty('--w', `${Math.round(100 * done / SKILLS.length)}%`);
  renderPlanCard();
}
function renderPlanCard() {
  const plan = store.plan(), card = $('planCard');
  if (!plan) { card.hidden = true; return; }
  card.hidden = false;
  const sw = plan.swimmerId ? store.swimmer(plan.swimmerId) : null, done = plan.items.filter(i => i.done).length;
  $('planMeta').textContent = `${sw ? sw.name + ' · ' : ''}${done} of ${plan.items.length} done`;
  $('planList').innerHTML = plan.items.map((it, i) => `<li class="${it.done ? 'done' : ''}"><label class="toggle"><input type="checkbox" data-i="${i}" ${it.done ? 'checked' : ''}><span><b>${fmtDate(it.day, { weekday: 'short', month: 'short', day: 'numeric' })}</b> ${esc(it.text)}</span></label></li>`).join('');
  $('planList').querySelectorAll('input').forEach(cb => cb.onchange = () => {
    const p = store.plan(); p.items[+cb.dataset.i].done = cb.checked;
    withBadges(p.swimmerId, () => store.savePlan(p));
    renderPlanCard(); if (p.items.every(i => i.done)) toast('Plan finished. Nice week.');
  });
}
function makePlanFrom(issueKey, swimmerId) {
  const plan = makePlan(issueKey, issueKey ? DRILLS[issueKey] : null, swimmerId);
  store.savePlan(plan); toast('Plan made. It is on the Score tab.'); show('home');
}
// The bundled sample lap: same pipeline, same rules, never saved to a swimmer.
function runSample() {
  $('homeError').hidden = true; $('strokeSelect').value = SAMPLE.stroke;
  return analyze(SAMPLE.src, SAMPLE.stroke, activeSwimmer(), 'lap').catch(err => { console.error('SafeDive', err); showError(err.message); });
}
function downloadText(text, name, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }

// ---------- pose model ----------
async function getDetector(note = () => {}, which = 'fast') {
  if (detectors[which]) return detectors[which];
  if (!detectorLoading[which]) {
    const m = POSE_MODELS[which];
    note(`Loading the ${m.label} (first time only, about ${m.mb} MB)…`);
    ort.env.wasm.wasmPaths = new URL('vendor/ort/', location.href).href;    // absolute: ort imports its .mjs/.wasm from here
    ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2); // only takes effect when the page is cross-origin isolated
    detectorLoading[which] = new YoloPose(ort, m.url, POSE_INPUT).load().then(d => { detectors[which] = d; if (which === 'fast') detector = d; return d; });
  }
  return detectorLoading[which];
}
function chosenModel() { return store.settings().carefulModel ? 'careful' : 'fast'; }
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

// mode 'lap' scores a lap (scoring.js); mode 'float' times the swimmer at the surface for the safety minute (safety.js)
async function analyze(src, stroke, swimmer, mode = 'lap', which = chosenModel()) {
  cancelFlag = false;
  show('analyze');
  $('analyzeTitle').textContent = mode === 'float' ? 'Timing the float' : 'Reading the swimmer';
  const video = $('video'), canvas = $('overlay'), ctx = canvas.getContext('2d');
  const note = t => { $('analyzeNote').textContent = t; };
  $('analyzeStage').classList.add('loading');
  $('bar').style.width = '0%'; $('progressBar').setAttribute('aria-valuenow', 0); $('readNow').textContent = '–'; $('readFrac').textContent = '0%'; $('readEta').textContent = '…';
  drawReadabilityStrip($('strip'), [], null, 1);
  const det = await getDetector(note, which);

  note('Opening the video…');
  video.src = src;
  await new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('This browser could not open that video. iPhone: Settings > Camera > Formats > Most Compatible, or share the clip as an MP4 and try again.')), 12000);
    video.onloadedmetadata = () => { clearTimeout(timer); res(); };
    video.onerror = () => { clearTimeout(timer); rej(new Error('Could not open that video.')); };
  });
  canvas.width = video.videoWidth; canvas.height = video.videoHeight; $('analyzeStage').classList.remove('loading');
  const duration = Math.min(video.duration || 0, mode === 'float' ? FLOAT_MAX_SECONDS : MAX_SECONDS);
  if (!duration) throw new Error('That video has no length. Try recording again.');

  // warm-up frame decides the sampling rate: fast devices get 8 frames a second, slow ones 4, so nobody waits minutes
  await seekTo(video, 0);
  let t0 = performance.now(); await det.run(video.videoWidth, video.videoHeight, pixelsFrom(video));
  const warmMs = performance.now() - t0;
  const fps = mode === 'float' ? 4 : (warmMs > 450 ? 4 : 8);
  const total = Math.floor(duration * fps);
  const perFrame = [], keypoints = [], times = [];
  let best = null, spent = 0, followed = null, history = [];      // the swimmer we follow and their recent keypoints (js/track.js)

  note(`Reading the swimmer with the ${POSE_MODELS[which].label}, ${fps} frames a second…`);
  for (let i = 0; i < total; i++) {
    if (cancelFlag) return null;
    const t = i / fps;
    await seekTo(video, t);
    t0 = performance.now();
    const poses = await det.run(video.videoWidth, video.videoHeight, pixelsFrom(video));
    spent += performance.now() - t0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let m = null, kps = null;
    followed = pickSwimmer(poses, followed, TRACK.maxJump);
    if (followed) { history.push(followed.keypoints); if (history.length > TRACK.smoothWin) history.shift(); } else history = [];
    if (followed) {
      kps = smoothKeypoints(history, TRACK.smoothWin); m = frameMetrics(kps);
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
  if (mode === 'float') { finishFloat(floatTest(perFrame, fps), 'clip', swimmer); return null; }

  const summary = clipSummary(perFrame, fps);
  const result = scoreClip(summary, stroke, fps);
  const moving = scoredMask(perFrame, fps);           // travelling AND not upright: exactly the frames the score used
  lastRun = { summary, result, perFrame, keypoints, times, moving, best, stroke, swimmer: swimmer ? swimmer.name : '', swimmerId: swimmer ? swimmer.id : null, src, fps, model: which, swimmerObj: swimmer, mode, date: new Date().toISOString(), sessionId: null, sample: src === SAMPLE.src };
  if (result.ok && !lastRun.sample) {            // the sample lap is a demo: never saved to a child's history
    const parts = {}; result.parts.forEach(p => { parts[p.key] = p.pts; });
    withBadges(lastRun.swimmerId, () => {
      const rec = store.addSession({ date: lastRun.date, swimmerId: lastRun.swimmerId, swimmer: lastRun.swimmer, stroke, score: result.score, torsoAngle: summary.torsoAngle, readable: summary.readableFrac, issues: result.issues, parts, fps, timeline: perFrame.map(m => (m ? +m.torsoAngle.toFixed(1) : null)) });
      lastRun.sessionId = rec.id;
    });
  }
  show('results');                 // charts need their real width, so the screen is shown before drawing
  renderResults();
  announce(result.ok ? `Lap scored ${result.score}. ${scoreWord(result.score)}.` : `Not scored. ${result.reason}`);
  if (result.ok) tick(result.score >= 80 ? [14, 60, 14] : 14);
  return lastRun;
}

// ---------- results ----------
let chartHit = null;
function renderResults() {
  const { summary, result, perFrame, times, moving, best, stroke, swimmer, fps, shared } = lastRun;
  $('sharedBanner').hidden = !shared; $('resStageWrap').hidden = !!shared;
  $('btnSaveCard').hidden = !!shared; $('btnCopyJson').hidden = !!shared; $('btnShareLink').hidden = !!shared; $('shareBox').hidden = true; $('btnMakePlan').hidden = !!shared;
  $('btnAgain').textContent = shared ? 'Score your own lap' : 'Score another lap';
  $('resHeader').textContent = `${lastRun.sample ? 'Our sample lap (not saved) · ' : swimmer ? swimmer + ' · ' : ''}${STROKES[stroke] || stroke} · ${new Date(lastRun.date).toLocaleDateString()}${lastRun.model === 'careful' ? ' · careful model' : ''}`;
  const scoreEl = $('resScore'), refuse = $('resRefuse'), parts = $('resParts'), tips = $('resTips');
  if (!result.ok) {
    scoreEl.hidden = true; parts.innerHTML = ''; tips.innerHTML = ''; $('tipsHead').hidden = true;
    refuse.hidden = false;
    const canRetry = !shared && lastRun.model === 'fast' && lastRun.src && (summary.readableFrac < THRESHOLDS.minReadable || result.steep);
    // two concrete things to try, picked by why it was refused
    const kind = result.steep ? 'steep' : /upright|vertical|end of the pool/i.test(result.reason) ? 'upright' : summary.readableFrac < THRESHOLDS.minReadable ? 'read' : 'still';
    const tries = { steep: ['Lower the phone: crouch on the deck so it sits a little above the water, side-on.', 'Film from the side of the lane, not from behind or ahead of the swimmer.'],
      upright: ['Stand on the side of the pool, not the end. From the end a flat body looks vertical.', 'Start after the push-off and stop before the wall, so most of the clip is swimming.'],
      read: ['Get closer: 3 to 5 metres away, landscape, the swimmer a good size in the frame.', 'Backstroke and back float read best. Freestyle filmed from the surface hides the hips.'],
      still: ['Start recording after the push-off and stop before the wall.', 'Aim for 10 to 15 seconds of the swimmer travelling across the pool.'] }[kind];
    refuse.innerHTML = `<b>Not scored.</b> ${esc(result.reason)}<br><span class="fine">Body readable in ${Math.round(summary.readableFrac * 100)}% of frames, travelling in ${Math.round(summary.movingFrac * 100)}%. The app refuses to guess rather than give a number it cannot stand behind.</span>`
      + `<div class="tries"><b>What to try</b><ul>${tries.map(t => `<li>${t}</li>`).join('')}</ul><a href="#" data-go="guide">The full filming guide</a></div>`
      + (canRetry ? `<button id="btnRetryCareful" class="btn secondary sm" type="button">Read it again with the careful model (slower, ${POSE_MODELS.careful.mb} MB once)</button>` : '')
      + (!shared && !lastRun.sample ? '<button id="btnSampleRes" class="btn ghost sm" type="button">See it work on our sample lap</button>' : '');
    if (canRetry) $('btnRetryCareful').onclick = () => analyze(lastRun.src, lastRun.stroke, lastRun.swimmerObj, lastRun.mode, 'careful').catch(err => { console.error('SafeDive', err); showError(err.message); });
    if ($('btnSampleRes')) $('btnSampleRes').onclick = runSample;
    $('btnMakePlan').hidden = true;
  } else {
    refuse.hidden = true; scoreEl.hidden = false; $('tipsHead').hidden = false; $('btnMakePlan').hidden = !!shared;
    const cls = result.score >= 80 ? 'good' : result.score >= 55 ? 'warn' : 'bad';
    const secs = shared ? summary.scoredFrames : summary.scoredFrames / fps;
    scoreEl.innerHTML = `<div class="num ${cls}">${result.score}</div><div><div class="word">${scoreWord(result.score)}</div><div class="conf">Body readable in ${Math.round(summary.readableFrac * 100)}% of frames · ${secs.toFixed(1)} s of swimming scored</div></div>`;
    // the number counts up once, the first time this lap is shown (not on resize, not with reduced motion)
    if (!lastRun.revealed && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      lastRun.revealed = true; const numEl = scoreEl.querySelector('.num'), t0 = performance.now(), dur = 650; numEl.textContent = '0';
      const step = now => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); numEl.textContent = Math.round(e * result.score); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
    parts.innerHTML = result.parts.map(p => { const f = p.pts / p.max, fill = f >= 0.8 ? 'var(--good)' : f >= 0.5 ? 'var(--warn)' : 'var(--bad)';
      return `<div class="part"><span class="name">${p.name}</span><span class="pts">${p.pts}<span class="fine">/${p.max}</span></span><span class="val">${esc(p.value)}</span><span class="meter"><i style="--w:${Math.round(f * 100)}%;--fill:${fill}"></i></span></div>`; }).join('');
    // one tip, one drill: the first tip that has a drill leads, full size; the rest follow smaller
    let lead = false;
    tips.innerHTML = result.tips.map((t, i) => { const d = drillFor(result.issues[i]); const cls = d ? (lead ? 'fix' : 'fix lead') : 'ok'; if (d) lead = true;
      return `<li class="${cls}"><span>${esc(t)}</span>${d ? `<button class="btn secondary sm" type="button" data-drill="${result.issues[i]}">Drill: ${d.name}</button>` : ''}</li>`; }).join('');
    tips.querySelectorAll('[data-drill]').forEach(b => b.onclick = () => openDrill(b.dataset.drill));
  }
  if (!shared) {
    const scrub = $('scrub'); scrub.max = Math.max(times.length - 1, 0); scrub.value = best ? best.index : 0;
    drawResultFrame(+scrub.value);
    chartHit = drawAngleChart($('angleChart'), perFrame, times, moving, +scrub.value);
  } else chartHit = drawAngleChart($('angleChart'), perFrame, times, moving, null);
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
  currentDrillKey = key;
  $('drillTitle').textContent = 'Drill: ' + d.name; $('drillWhy').textContent = d.why;
  $('drillSteps').innerHTML = d.steps.map(s => `<li>${s}</li>`).join(''); $('drillReps').textContent = 'How much: ' + d.reps;
  const done = lastRun && lastRun.sessionId && (store.sessions().find(s => s.id === lastRun.sessionId) || {}).drillDone;
  $('btnDrillDone').textContent = done ? 'Practised' : 'We practised this'; $('btnDrillDone').disabled = !!done;
  show('drill');
}

// Share a canvas as a picture: the phone's share sheet when there is one, else a download.
async function shareCanvas(card, name, title) {
  const blob = await new Promise(r => card.toBlob(r, 'image/png'));
  const file = new File([blob], name, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title }); announce(title + ' shared'); return; } catch (e) { /* user closed the sheet: fall through to download */ } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('Saved ' + name);
}
function saveReportCard() { return shareCanvas(makeReportCard(lastRun, lastRun.fps), `safedive-${(lastRun.swimmer || 'lap').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'lap'}-${lastRun.date.slice(0, 10)}.png`, 'SafeDive Coach report card'); }
async function copyJson(btn) {
  const text = JSON.stringify(resultToJSON(lastRun, lastRun.fps), null, 2);
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
  catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); btn.textContent = 'Copied'; }
  announce('Copied the result as JSON');
  setTimeout(() => { btn.textContent = 'Copy as JSON'; }, 1800);
}
async function shareLink() {
  const url = `${location.origin}${location.pathname}#lap=${packLap(lastRun, lastRun.fps)}`;
  const title = `SafeDive Coach: ${lastRun.swimmer || 'a lap'} scored ${lastRun.result.ok ? lastRun.result.score : 'not scored'}`;
  $('shareUrl').value = url; $('shareBox').hidden = false;
  if (navigator.share) { try { await navigator.share({ title, url }); return; } catch (e) { /* closed: fall through to copy */ } }
  try { await navigator.clipboard.writeText(url); toast('Link copied. Only the numbers are in it.'); } catch (e) { $('shareUrl').focus(); $('shareUrl').select(); }
}

// ---------- live coach ----------
function setupLive() {
  live = new LiveCoach({ video: $('liveVideo'), canvas: $('liveOverlay'), getDetector: () => getDetector(t => { $('liveCue').textContent = t; }), pixelsFrom, frameMetrics, drawSkeleton, floatState, pickSwimmer, smoothKeypoints, track: TRACK });
  live.voice = !!store.settings().voice; $('voiceToggle').checked = live.voice;
}
function prepareLive(test) {
  liveTest = test;
  $('liveTitle').textContent = test ? 'Float test' : 'Live coach';
  $('liveIntro').textContent = test ? `The camera times how long the swimmer stays at the surface, floating or treading, in water over their head. ${test.seconds} seconds passes the skill. Keep the whole body in the shot from the side.` : 'Point the phone at the swimmer from the side. The dial shows the body line as it happens, with one cue to call out. Nothing is recorded.';
  $('holdBox').hidden = !test; $('holdTarget').textContent = `of ${test ? test.seconds : 60} s at the surface`; $('holdSecs').textContent = '0 s'; $('holdFill').style.setProperty('--w', '0%');
  $('liveWord').textContent = 'Camera off'; $('liveCue').textContent = 'Tap Start to turn on the camera.'; $('liveError').hidden = true;
  $('liveAngle').textContent = '–'; $('liveFps').textContent = '–'; $('liveMs').textContent = '–';
  drawDial($('dial'), null);
}
async function startLive() {
  const btn = $('btnLiveStart'); btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Starting…'; $('liveError').hidden = true;
  $('liveWord').textContent = 'Asking for the camera'; $('liveCue').textContent = 'If the browser asks, tap Allow. The picture never leaves the phone.';
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('This browser cannot open the camera. On a phone, use Safari or Chrome.');
    await live.start(liveTest ? 'surface' : 'coach', {
      seconds: liveTest ? liveTest.seconds : 60,
      onUpdate: u => {
        $('liveWord').textContent = u.word; $('liveCue').textContent = u.cue;
        $('liveAngle').textContent = u.angle === null ? '–' : `${Math.round(u.angle)}°`; $('liveFps').textContent = u.fps.toFixed(1); $('liveMs').textContent = Math.round(u.ms);
        drawDial($('dial'), u.angle);
        if (u.held !== null) { const pct = Math.min(100, 100 * u.held / u.target); $('holdSecs').textContent = `${Math.floor(u.held)} s`; $('holdFill').style.setProperty('--w', `${pct}%`); $('holdBox').querySelector('.meter').setAttribute('aria-valuenow', Math.floor(u.held)); }
      },
      onDone: r => finishFloat(r, 'camera', activeSwimmer()),
    });
    $('liveBadge').hidden = false; btn.hidden = true; $('btnLiveStop').hidden = false; $('liveStage').classList.remove('off');
  } catch (e) {
    $('liveWord').textContent = 'Camera off'; $('liveCue').textContent = 'Tap Start to try again.';
    const msg = e.name === 'NotAllowedError' ? 'Camera permission was refused. Allow the camera for this site in the browser settings and try again.' : e.name === 'NotFoundError' ? 'No camera found on this device.' : e.message;
    $('liveError').textContent = msg; $('liveError').hidden = false;
  }
  btn.removeAttribute('aria-busy'); btn.textContent = 'Start camera';
}
function stopLive() {
  const r = live.stop();
  $('liveBadge').hidden = true; $('btnLiveStart').hidden = false; $('btnLiveStop').hidden = true; $('liveStage').classList.add('off');
  $('liveWord').textContent = 'Camera off'; $('liveCue').textContent = 'Tap Start to turn on the camera.';
  return r;
}

// ---------- water safety ----------
let confirmSkill = null;              // skill key waiting for the second tap of "I watched this"
function renderSafety() {
  const sw = activeSwimmer();
  $('safetyEmpty').hidden = !!sw; $('safetyBody').hidden = !sw;
  if (!sw) return;
  const entries = store.skillsFor(sw.id), done = skillsDone(entries);
  $('safetyCount').textContent = `${done} of ${SKILLS.length}`;
  $('safetyMeter').style.setProperty('--w', `${Math.round(100 * done / SKILLS.length)}%`); $('safetyMeter').parentElement.setAttribute('aria-valuenow', done);
  $('btnSafetyCard').hidden = done < SKILLS.length;
  $('skillList').innerHTML = SKILLS.map(s => {
    const e = entries[s.key];
    const status = e ? (e.how === 'app' ? `Checked by the camera: ${e.seconds} s at the surface · ${fmtDate(e.date)}` : `Signed off ${fmtDate(e.date)}`) : 'Not yet';
    let actions;
    if (e) actions = `<button class="btn ghost sm" type="button" data-undo="${s.key}">Undo</button>`;
    else if (confirmSkill === s.key) actions = `<button class="btn primary sm" type="button" data-sign="${s.key}">Yes, in deep water, I watched it</button><button class="btn ghost sm" type="button" data-cancel>Cancel</button>`;
    else actions = `<button class="btn secondary sm" type="button" data-ask="${s.key}">I watched this</button>${s.how === 'camera' ? `<button class="btn secondary sm" type="button" data-cam>Test with the camera</button><button class="btn secondary sm" type="button" data-clip>Time a clip</button>` : ''}`;
    return `<li class="skill${e ? ' done' : ''}"><div class="skill-head"><span class="tick" aria-hidden="true"></span><b>${s.name}</b></div><p>${s.text}</p><span class="status ${e ? 'ok' : ''}">${status}</span><div class="skill-actions">${actions}</div></li>`;
  }).join('');
  const list = $('skillList');
  list.querySelectorAll('[data-ask]').forEach(b => b.onclick = () => { confirmSkill = b.dataset.ask; renderSafety(); });
  list.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => { confirmSkill = null; renderSafety(); });
  list.querySelectorAll('[data-sign]').forEach(b => b.onclick = () => { confirmSkill = null; withBadges(sw.id, () => store.setSkill(sw.id, b.dataset.sign, { date: new Date().toISOString().slice(0, 10), how: 'parent' })); renderSafety(); toast('Signed off.'); });
  list.querySelectorAll('[data-undo]').forEach(b => b.onclick = () => { store.setSkill(sw.id, b.dataset.undo, null); renderSafety(); });
  list.querySelectorAll('[data-cam]').forEach(b => b.onclick = () => show('live', { test: { seconds: FLOAT.minSeconds } }));
  list.querySelectorAll('[data-clip]').forEach(b => b.onclick = () => $('floatFile').click());
}
// Both ways of timing the minute end here: the camera (live.js) or a clip (analyze with mode 'float').
function finishFloat(r, how, swimmer) {
  const target = r.minSeconds || FLOAT.minSeconds;
  $('floatHeader').textContent = `${swimmer ? swimmer.name + ' · ' : ''}Float test · ${how === 'camera' ? 'live camera' : 'from a clip'} · ${new Date().toLocaleDateString()}`;
  $('floatNum').textContent = `${Math.floor(r.seconds)}`; $('floatNum').className = 'num ' + (r.pass ? 'good' : 'warn');
  $('floatWord').textContent = r.pass ? 'Passed' : 'Not yet';
  $('floatConf').textContent = `seconds at the surface${r.mode && r.mode !== 'surface' ? ', mostly ' + (r.mode === 'float' ? 'floating' : 'treading') : ''}${r.readableFrac !== undefined ? ` · body readable in ${Math.round(r.readableFrac * 100)}% of frames` : ''}`;
  $('floatFill').style.setProperty('--w', `${Math.min(100, Math.round(100 * r.seconds / target))}%`);
  if (r.pass) {
    if (swimmer) { withBadges(swimmer.id, () => store.setSkill(swimmer.id, 'float', { date: new Date().toISOString().slice(0, 10), how: 'app', seconds: r.seconds })); $('floatNote').textContent = `${swimmer.name} stayed at the surface for ${Math.floor(r.seconds)} seconds. The skill is signed off as checked by the camera.`; }
    else $('floatNote').textContent = 'Passed, but there is no swimmer selected to record it for. Add a swimmer on the Score tab and run it again.';
  } else $('floatNote').textContent = r.seconds < 5 ? 'The camera could not keep the swimmer in view long enough. Film from the side, low, with the whole body in the frame, and try again.' : `The longest stretch at the surface was ${Math.floor(r.seconds)} seconds. The skill needs ${target}. Practise floating on the back with ears in the water, then try again.`;
  show('floatresult'); announce(`Float test ${r.pass ? 'passed' : 'not passed'}: ${Math.floor(r.seconds)} seconds`); if (r.pass) tick([14, 60, 14, 60, 14]);
}

// ---------- progress ----------
let progressSelected = -1, historyHit = null;
// one stroked glyph per badge, drawn in the seal's ink (24-unit grid, same stroke style as the tab icons)
const BADGE_ICONS = {
  first_lap: '<path d="M9 7l4-3v16M8 20h10"/>',
  strong_lap: '<path d="M13 3L5 14h6l-1 7 9-12h-6z"/>',
  flat_board: '<path d="M3 12c4-4 14-4 18 0c-4 4-14 4-18 0z"/><path d="M7 12h10"/>',
  three_week: '<path d="M3 7l2 2 4-4M3 13l2 2 4-4M3 19l2 2 4-4M13 7h8M13 13h8M13 19h8"/>',
  comeback: '<path d="M4 18l6-6 4 4 7-7M15 9h6v6"/>',
  drill_done: '<path d="M3 9h10a5 5 0 1 1 0 10h-1a5 5 0 0 1-5-5v-2H3z"/><path d="M13 9V5"/>',
  plan_week: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/>',
  floater: '<circle cx="6" cy="10" r="2.5"/><path d="M9 11h8l4 1M3 17c3 2 6-2 9 0s6 2 9 0"/>',
  water_safe: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/>',
  streak_4: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 0-6 1-9z"/>',
};
function renderProgress() {
  const sw = activeSwimmer(), s = store.sessionsFor(sw ? sw.id : null);
  const lvl = levelFor(s.length), needs = [0, 3, 8, 15, 25];
  $('levelName').textContent = lvl.name;
  $('levelNext').textContent = lvl.toNext === null ? 'Top level. Keep the streak going.' : `${lvl.toNext} more scored ${lvl.toNext === 1 ? 'lap' : 'laps'} to ${['Minnow', 'Otter', 'Dolphin', 'Shark'][lvl.index]}. Week streak: ${weekStreak(s)}.`;
  const span = lvl.toNext === null ? 1 : (needs[lvl.index + 1] - needs[lvl.index]);
  const frac = lvl.toNext === null ? 1 : (s.length - needs[lvl.index]) / span;
  const levelPct = Math.round(100 * Math.max(0, Math.min(1, frac)));
  $('levelFill').style.setProperty('--w', `${levelPct}%`); $('levelMeter').setAttribute('aria-valuenow', levelPct);
  // badges
  const earned = badgesFor(sw ? sw.id : null);
  $('badgeGrid').innerHTML = BADGES.map(b => `<div class="badge${earned.includes(b.key) ? ' on' : ''}" title="${esc(b.how)}"><span class="seal" aria-hidden="true"><svg viewBox="0 0 24 24">${BADGE_ICONS[b.key] || ''}</svg></span><b>${b.name}</b><span class="fine">${b.how}</span></div>`).join('');
  const last = s.slice(-12);
  historyHit = drawHistoryChart($('historyChart'), last, progressSelected >= 0 ? progressSelected - (s.length - last.length) : -1);
  const detail = $('sessionDetail');
  if (progressSelected >= 0 && s[progressSelected]) {
    const x = s[progressSelected];
    detail.hidden = false;
    detail.innerHTML = `<b>${fmtDate(x.date, { weekday: 'short', month: 'short', day: 'numeric' })}</b> · ${esc(x.swimmer) || 'no name'} · ${STROKES[x.stroke] || x.stroke}<br>Score ${x.score} (${scoreWord(x.score)}). Body line ${x.torsoAngle === null || x.torsoAngle === undefined ? '–' : x.torsoAngle.toFixed(0) + '°'} from flat, readable in ${Math.round((x.readable || 0) * 100)}% of frames.${x.issues ? '<br><span class="fine">Worked on: ' + x.issues.filter(k => !NO_DRILL.has(k)).map(k => DRILLS[k] ? DRILLS[k].name : k).join(', ') + (x.drillDone ? ' · drill practised' : '') + '</span>' : ''}`;
    if (x.issues) { const drill = x.issues.find(k => !NO_DRILL.has(k)); if (drill) detail.innerHTML += ` <a href="#" data-drill="${drill}">Open the drill</a>`; detail.querySelectorAll('[data-drill]').forEach(a => a.onclick = ev => { ev.preventDefault(); openDrill(a.dataset.drill); }); }
  } else detail.hidden = true;
  $('historyList').innerHTML = s.map((x, i) => `<button type="button" class="hist${i === progressSelected ? ' on' : ''}" data-i="${i}" aria-pressed="${i === progressSelected}"><div>${new Date(x.date).toLocaleDateString()} · ${esc(x.swimmer)} <span>${STROKES[x.stroke] || x.stroke}</span></div><b>${x.score}</b></button>`).reverse().join('')
    || '<div class="empty"><b>No laps scored yet</b><p>Film one lap from the side of the pool and the score shows up here.</p><button class="btn secondary sm" type="button" data-go="home">Score a lap</button></div>';
  $('historyList').querySelectorAll('.hist').forEach(el => el.onclick = () => { progressSelected = +el.dataset.i; renderProgress(); });
  $('btnCompare').hidden = s.filter(x => x.timeline).length < 2;
}

// ---------- compare two laps ----------
function renderCompare() {
  const sw = activeSwimmer(), s = store.sessionsFor(sw ? sw.id : null).filter(x => x.timeline);
  const opt = (x, i) => `<option value="${x.id}">${new Date(x.date).toLocaleDateString()} · ${STROKES[x.stroke] || x.stroke} · ${x.score}</option>`;
  const A = $('cmpA'), B = $('cmpB'); const keepA = A.value, keepB = B.value;
  A.innerHTML = s.map(opt).join(''); B.innerHTML = s.map(opt).join('');
  const few = s.length < 2; $('compareEmpty').hidden = !few; $('compareBody').hidden = few;
  if (few) return;
  A.value = s.some(x => x.id === keepA) ? keepA : s[s.length - 2].id; B.value = s.some(x => x.id === keepB) ? keepB : s[s.length - 1].id;
  const a = s.find(x => x.id === A.value), b = s.find(x => x.id === B.value);
  drawCompareChart($('compareChart'), a, b);
  const row = (name, va, vb, unit, lowerBetter) => { const d = vb - va, better = lowerBetter ? d < 0 : d > 0; return `<tr><td>${name}</td><td>${va}${unit}</td><td>${vb}${unit}</td><td class="${d === 0 ? '' : better ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d}${unit}</td></tr>`; };
  const ang = x => (x.torsoAngle === null || x.torsoAngle === undefined ? null : Math.round(x.torsoAngle));
  $('compareTable').innerHTML = `<thead><tr><th>&nbsp;</th><th>A</th><th>B</th><th>Change</th></tr></thead><tbody>${row('Score', a.score, b.score, '', false)}${ang(a) !== null && ang(b) !== null ? row('Body line', ang(a), ang(b), '°', true) : ''}${a.parts && b.parts ? row('Head', a.parts.head, b.parts.head, '', false) + row('Rhythm', a.parts.rhythm, b.parts.rhythm, '', false) : ''}</tbody>`;
  const dAng = ang(a) !== null && ang(b) !== null ? ang(a) - ang(b) : null, dScore = b.score - a.score;
  $('compareNote').textContent = dAng !== null && Math.abs(dAng) >= 5 ? (dAng > 0 ? `The body line is ${dAng}° flatter in lap B. That is the change the drills are for.` : `The body line dropped ${-dAng}° in lap B. Check the filming angle first, then the kick.`) : dScore >= 10 ? `Lap B scored ${dScore} points higher.` : dScore <= -10 ? `Lap B scored ${-dScore} points lower.` : 'About the same. Small differences are normal between laps.';
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
  const s = store.sessions(), sw = store.swimmers();
  $('dataSummary').textContent = s.length || sw.length ? `${sw.length} ${sw.length === 1 ? 'swimmer' : 'swimmers'}, ${s.length} scored ${s.length === 1 ? 'lap' : 'laps'} stored on this device${s.length ? ', the first on ' + new Date(s[0].date).toLocaleDateString() : ''}. Each lap is a date, the swimmer, the stroke, the scores and the body-angle line.` : 'Nothing stored yet.';
  $('swimmerManage').innerHTML = sw.map(x => `<div class="hist"><div>${esc(x.name)} <span>${store.sessionsFor(x.id).length} laps · ${skillsDone(store.skillsFor(x.id))} skills</span></div><button class="btn ghost sm" type="button" data-remove="${x.id}">Remove</button></div>`).join('');
  $('swimmerManage').querySelectorAll('[data-remove]').forEach(b => b.onclick = () => { const x = store.swimmer(b.dataset.remove); if (x && confirm(`Remove ${x.name} and all their laps and skills from this device?`)) { store.removeSwimmer(x.id); renderSettings(); renderSwimmerRows(); toast(`${x.name} removed`); } });
  $('versionTag').textContent = APP_VERSION;
  $('carefulToggle').checked = !!store.settings().carefulModel;
}

// ---------- install (PWA) ----------
function setupInstall() {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    // On a host that cannot send the isolation headers (GitHub Pages), sw.js adds them; the page has to load once more through the
    // worker before the model gets its threads. Reload once, only while idle on the home screen, never in the middle of a reading.
    if (!crossOriginIsolated && !sessionStorage.getItem('safedive.reloaded')) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!$('screen-home').classList.contains('active')) return;
        sessionStorage.setItem('safedive.reloaded', '1'); location.reload();
      });
    }
  }
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone || store.settings().installDismissed) return;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; $('installHint').hidden = false; });
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (ios) { $('installText').textContent = 'In Safari: tap Share, then "Add to Home Screen". It then works at the pool with no signal.'; $('btnInstall').hidden = true; $('installHint').hidden = false; }
  $('btnInstall').onclick = async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; $('installHint').hidden = true; };
  $('btnInstallNo').onclick = () => { store.setSetting('installDismissed', true); $('installHint').hidden = true; };
}

// ---------- wiring ----------
window.addEventListener('DOMContentLoaded', () => {
  setupLive(); setupInstall();
  renderSwimmerRows(); refreshHome();
  // consent sheet on first run: a real modal, the rest of the page is inert until Continue
  const setModal = on => { $('app').inert = on; document.querySelector('.tabs').inert = on; document.querySelector('.top').inert = on; };
  const sheet = $('consentSheet');
  if (!store.consented()) { sheet.hidden = false; setModal(true); requestAnimationFrame(() => requestAnimationFrame(() => { sheet.classList.add('open'); $('consentTitle').focus({ preventScroll: true }); })); }
  $('consentCheck').onchange = e => { $('btnConsent').disabled = !e.target.checked; };
  $('btnConsent').onclick = () => {
    store.setConsented(); setModal(false); $('btnPick').focus();
    sheet.classList.remove('open'); sheet.classList.add('out');           // leaves the way it came: down, a little faster
    const done = () => { sheet.hidden = true; sheet.classList.remove('out'); };
    sheet.addEventListener('transitionend', done, { once: true }); setTimeout(done, 400);
  };

  // swimmers
  document.body.addEventListener('click', e => { if (e.target.closest('[data-add-swimmer]')) openAddSwimmer(); });
  $('addSwimmerForm').onsubmit = e => { e.preventDefault(); const s = store.addSwimmer($('addSwimmerName').value); if (!s) { $('addSwimmerName').setAttribute('aria-invalid', 'true'); return; } $('addSwimmerName').removeAttribute('aria-invalid'); store.setCurrentSwimmer(s.id); $('addSwimmerForm').hidden = true; refreshAll(); toast(`${s.name} added`); };
  $('btnAddCancel').onclick = () => { $('addSwimmerForm').hidden = true; };

  // score a lap
  $('btnPick').onclick = () => $('fileInput').click();
  $('fileInput').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    $('homeError').hidden = true;
    try { await analyze(URL.createObjectURL(f), $('strokeSelect').value, activeSwimmer(), 'lap'); }
    catch (err) { console.error('SafeDive', err); showError(err.message); }
    e.target.value = '';
  };
  $('floatFile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { await analyze(URL.createObjectURL(f), 'float', activeSwimmer(), 'float'); }
    catch (err) { console.error('SafeDive', err); showError(err.message); }
    e.target.value = '';
  };
  $('btnLive').onclick = () => show('live');
  $('btnSample').onclick = runSample;
  $('lastLap').onclick = () => { const sw = activeSwimmer(); progressSelected = store.sessionsFor(sw ? sw.id : null).length - 1; show('progress'); };
  $('btnCancel').onclick = () => { cancelFlag = true; show('home'); };
  $('btnAgain').onclick = () => { if (lastRun && lastRun.shared) history.replaceState(null, '', location.pathname); show('home'); };
  $('btnDrillBack').onclick = () => show('results');
  $('btnDrillDone').onclick = () => { if (!lastRun || !lastRun.sessionId) { toast('Noted. Score a lap to keep track of drills.'); return; } withBadges(lastRun.swimmerId, () => store.updateSession(lastRun.sessionId, { drillDone: true })); $('btnDrillDone').textContent = 'Practised'; $('btnDrillDone').disabled = true; toast('Marked as practised.'); };
  $('btnDrillPlan').onclick = () => makePlanFrom(currentDrillKey, lastRun ? lastRun.swimmerId : (activeSwimmer() || {}).id);
  $('btnMakePlan').onclick = () => { const key = lastRun.result.issues.find(k => !NO_DRILL.has(k)) || null; makePlanFrom(key, lastRun.swimmerId !== undefined ? lastRun.swimmerId : (activeSwimmer() || {}).id); };
  $('btnSaveCard').onclick = saveReportCard;
  $('btnCopyJson').onclick = e => copyJson(e.currentTarget);
  $('btnShareLink').onclick = shareLink;
  $('levelPill').onclick = () => show('progress');
  $('btnClear').onclick = () => { if (confirm('Delete every swimmer, lap, skill and plan on this device? This cannot be undone.')) { store.clearAll(); progressSelected = -1; renderSettings(); renderSwimmerRows(); refreshHome(); toast('Everything deleted'); } };

  // plan card
  $('btnPlanIcs').onclick = () => { const p = store.plan(); if (!p) return; const sw = p.swimmerId ? store.swimmer(p.swimmerId) : null; downloadText(planToICS(p, sw ? sw.name : ''), 'safedive-plan.ics', 'text/calendar'); toast('Calendar file saved. Open it to add the three days.'); };
  $('btnPlanClear').onclick = () => { store.savePlan(null); renderPlanCard(); };

  // live
  $('btnLiveStart').onclick = startLive;
  $('btnLiveStop').onclick = () => { const r = stopLive(); if (liveTest && r) finishFloat(r, 'camera', activeSwimmer()); };
  $('voiceToggle').onchange = e => { live.voice = e.target.checked; store.setSetting('voice', e.target.checked); };
  $('carefulToggle').onchange = e => { store.setSetting('carefulModel', e.target.checked); toast(e.target.checked ? 'Laps will use the careful model.' : 'Laps will use the fast model.'); };
  $('btnFloatAgain').onclick = () => show('live', { test: { seconds: FLOAT.minSeconds } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && live && live.running) stopLive(); });

  // safety card, compare
  $('btnSafetyCard').onclick = () => { const sw = activeSwimmer(); shareCanvas(drawSafetyCard(sw, store.skillsFor(sw.id), SKILLS), `safedive-water-safe-${sw.name.replace(/[^a-z0-9]/gi, '').toLowerCase()}.png`, 'Water-safe card'); };
  $('btnCompare').onclick = () => show('compare');
  $('cmpA').onchange = renderCompare; $('cmpB').onchange = renderCompare;

  // tabs: click, and arrow keys the way a native tab strip does
  const tabButtons = [...document.querySelectorAll('.tabs button')];
  tabButtons.forEach(b => b.onclick = () => show(b.dataset.tab));
  document.querySelector('.tabs').addEventListener('keydown', e => {
    const i = tabButtons.indexOf(document.activeElement); if (i < 0) return;
    const j = e.key === 'ArrowRight' ? (i + 1) % tabButtons.length : e.key === 'ArrowLeft' ? (i + tabButtons.length - 1) % tabButtons.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabButtons.length - 1 : -1;
    if (j < 0) return; e.preventDefault(); show(tabButtons[j].dataset.tab, { focus: false }); tabButtons[j].focus();
  });
  document.body.addEventListener('click', e => { const go = e.target.closest('[data-go]'); if (go) { e.preventDefault(); show(go.dataset.go); } });

  // results interactions
  $('scrub').oninput = e => { const i = +e.target.value; drawResultFrame(i); chartHit = drawAngleChart($('angleChart'), lastRun.perFrame, lastRun.times, lastRun.moving, i); };
  $('targetToggle').onchange = () => drawResultFrame(+$('scrub').value);
  $('angleChart').onclick = e => { if (!chartHit || lastRun.shared) return; const r = e.currentTarget.getBoundingClientRect(); const i = chartHit(e.clientX - r.left); $('scrub').value = i; $('scrub').oninput({ target: $('scrub') }); };
  $('historyChart').onclick = e => { if (!historyHit) return; const r = e.currentTarget.getBoundingClientRect(); const i = historyHit(e.clientX - r.left); if (i >= 0) { const sw = activeSwimmer(); const s = store.sessionsFor(sw ? sw.id : null); progressSelected = s.length - Math.min(12, s.length) + i; renderProgress(); } };
  $('studyChart').onclick = e => { if (!studyHit) return; const r = e.currentTarget.getBoundingClientRect(); const q = studyHit(e.clientX - r.left, e.clientY - r.top); if (q) { studySelected = q; renderEvidence(); } };
  let resizeTimer; window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { const on = document.querySelector('.screen.active').id.replace('screen-', ''); if (on === 'results' && lastRun) renderResults(); if (on === 'progress') renderProgress(); if (on === 'evidence') renderEvidence(); if (on === 'compare') renderCompare(); if (on === 'live') drawDial($('dial'), null); }, 150); });

  // the cover photo gets its skeleton once the browser is idle, so the first paint is instant
  const idle = window.requestIdleCallback || (f => setTimeout(f, 1500));
  idle(() => decorateHero());

  const q = new URLSearchParams(location.search);
  // ?screen=name opens a screen directly (demos, screenshots); ?sample=path runs a clip without the file picker; #lap= is a shared lap
  if (q.get('screen')) show(q.get('screen'), { focus: false });
  if (q.get('sample')) analyze(q.get('sample'), q.get('stroke') || 'freestyle', activeSwimmer(), q.get('mode') || 'lap').catch(err => { console.error('SafeDive', err); showError(err.message); });
  if (location.hash.startsWith('#lap=')) { try { lastRun = unpackLap(location.hash.slice(5)); show('results', { focus: false }); renderResults(); } catch (e) { showError('That shared link could not be read.'); } }
  window.SafeDive = { analyze, show, store, lastRun: () => lastRun, toast };
});
