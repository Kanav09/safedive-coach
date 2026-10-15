// SafeDive Coach: turns a clip summary (from metrics.js) into a score and plain-English coaching.
// Thresholds are STARTING POINTS tuned on one pool's footage. Change them in one place: THRESHOLDS.

const THRESHOLDS = {
  minReadable: 0.30,     // below this share of readable frames we refuse to score
  minScoredSeconds: 1.0, // need at least this much travelling, readable swimming
  bodyLine: { great: 15, ok: 30 },          // torso angle in degrees (0 = flat)
  headLift: { freestyle: [-0.1, 0.35], backstroke: [0.0, 0.5], kick: [-0.1, 0.4], breaststroke: [-0.1, 0.6] },
  strokeHz: { freestyle: [0.5, 1.3], backstroke: [0.5, 1.2], breaststroke: [0.3, 0.9], kick: [0.3, 3.0] },
};

const STROKES = {
  freestyle: 'Freestyle',
  backstroke: 'Backstroke',
  breaststroke: 'Breaststroke',
  kick: 'Kickboard kick',
};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Returns {ok:false, reason} when the clip cannot be scored honestly, else {ok:true, score, parts, tips}.
function scoreClip(summary, stroke, fps) {
  const T = THRESHOLDS;
  if (summary.readableFrac < T.minReadable) {
    return { ok: false, reason: `I could only see the swimmer's body in ${Math.round(summary.readableFrac * 100)}% of the video. Film from the side at waist height, closer, with less splash, and try again.` };
  }
  if (summary.scoredFrames / fps < T.minScoredSeconds) {
    return { ok: false, reason: 'I did not see enough actual swimming. Start recording after the push-off and stop before the wall, so the clip is the swimmer travelling, not standing.' };
  }

  const parts = [];
  const tips = [];
  const issues = [];                         // short keys for the tips, used to pick a drill (see js/drills.js)
  const say = (key, text) => { issues.push(key); tips.push(text); };

  // 1. Body line (hips) : 50 points
  const a = summary.torsoAngle;
  let bodyPts;
  if (a <= T.bodyLine.great) bodyPts = 50;
  else if (a <= T.bodyLine.ok) bodyPts = 50 - 25 * (a - T.bodyLine.great) / (T.bodyLine.ok - T.bodyLine.great);
  else bodyPts = clamp(25 - 25 * (a - T.bodyLine.ok) / 30, 0, 25);
  parts.push({ key: 'body', name: 'Body line', pts: Math.round(bodyPts), max: 50, value: `${a.toFixed(0)} degrees from flat` });
  if (a > T.bodyLine.ok) say('hips_low', 'Hips are sinking. Press the chest down and look at the bottom of the pool so the hips float up. Try kicking from the hips, not the knees.');
  else if (a > T.bodyLine.great) say('hips_slightly_low', 'Body line is a little low. Keep the kick going steadily so the legs stay near the surface.');
  else say('body_flat', 'Body line is flat. Nice.');

  // 2. Head position : 30 points
  const hl = summary.headLift;
  const [lo, hi] = T.headLift[stroke] || T.headLift.freestyle;
  let headPts = 30;
  if (hl === null) { headPts = 15; parts.push({ key: 'head', name: 'Head position', pts: 15, max: 30, value: 'face not visible' }); say('face_unseen', 'I could not see the face, so head position is a guess. Film from the side.'); }
  else {
    if (hl > hi) headPts = clamp(30 - 60 * (hl - hi), 0, 30);
    if (hl < lo) headPts = clamp(30 - 60 * (lo - hl), 0, 30);
    parts.push({ key: 'head', name: 'Head position', pts: Math.round(headPts), max: 30, value: `nose ${hl >= 0 ? 'above' : 'below'} shoulders by ${Math.abs(hl).toFixed(2)} body-lengths` });
    if (hl > hi) say('head_high', stroke === 'backstroke' ? 'Chin is tucked too far up. Look straight up, ears in the water.' : 'Head is lifted too high. Look down at the bottom and breathe to the side, not forward.');
    else if (hl < lo) say('head_low', 'Head is buried. Keep the water line around the hairline.');
    else say('head_ok', 'Head position looks right.');
  }

  // 3. Stroke rhythm : 20 points
  const hz = summary.strokeHz;
  const [slo, shi] = T.strokeHz[stroke] || T.strokeHz.freestyle;
  let rhythmPts = 20;
  if (hz === null) { rhythmPts = 10; parts.push({ key: 'rhythm', name: 'Stroke rhythm', pts: 10, max: 20, value: 'arms not visible long enough' }); }
  else {
    if (hz < slo) rhythmPts = clamp(20 - 40 * (slo - hz), 0, 20);
    if (hz > shi) rhythmPts = clamp(20 - 20 * (hz - shi), 0, 20);
    parts.push({ key: 'rhythm', name: 'Stroke rhythm', pts: Math.round(rhythmPts), max: 20, value: `${(hz * 60).toFixed(0)} strokes per minute` });
    if (hz < slo) say('rhythm_slow', 'Strokes are slow and stop-start. Keep the arms moving continuously, one arm always pulling.');
    else if (hz > shi) say('rhythm_fast', 'Arms are spinning fast but short. Reach further forward on each stroke.');
    else say('rhythm_ok', 'Stroke rhythm is steady.');
  }

  const score = Math.round(bodyPts + headPts + rhythmPts);
  return { ok: true, score, parts, tips, issues, confidence: summary.readableFrac };
}

// A plain word for a score, so the screen and the report card agree.
function scoreWord(score) { return score >= 80 ? 'Strong lap' : score >= 55 ? 'Getting there' : 'Work on this'; }

// Game layer: level from total sessions, streak from consecutive weeks with a session.
function levelFor(sessionCount) {
  const names = ['Tadpole', 'Minnow', 'Otter', 'Dolphin', 'Shark'];
  const needs = [0, 3, 8, 15, 25];
  let lvl = 0;
  for (let i = 0; i < needs.length; i++) if (sessionCount >= needs[i]) lvl = i;
  const next = needs[lvl + 1];
  return { index: lvl, name: names[lvl], toNext: next === undefined ? null : next - sessionCount };
}

function weekKey(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day);   // Monday
  return x.toISOString().slice(0, 10);
}

function weekStreak(sessions, now = new Date()) {
  const weeks = new Set(sessions.map(s => weekKey(s.date)));
  let streak = 0; const cur = new Date(now);
  while (weeks.has(weekKey(cur))) { streak++; cur.setDate(cur.getDate() - 7); }
  return streak;
}

if (typeof module !== 'undefined') module.exports = { THRESHOLDS, STROKES, scoreClip, scoreWord, levelFor, weekStreak, weekKey };
