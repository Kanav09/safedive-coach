// SafeDive Coach: badges are computed from what is stored, never stored themselves, so they can never be wrong or lost.
// earnedBadges() is a pure function of (sessions, skills, plan) for one swimmer; the app diffs before/after a save to say "new badge".

const BADGES = [
  { key: 'first_lap', name: 'First lap', how: 'Score one lap.', test: d => d.sessions.length >= 1 },
  { key: 'strong_lap', name: 'Strong lap', how: 'Score 80 or more on a lap.', test: d => d.sessions.some(s => s.score >= 80) },
  { key: 'flat_board', name: 'Flat as a board', how: 'A lap with the body line under 15° from flat.', test: d => d.sessions.some(s => s.torsoAngle !== null && s.torsoAngle !== undefined && s.torsoAngle < 15) },
  { key: 'three_week', name: 'Three in a week', how: 'Three laps scored in the same week.', test: d => { const c = {}; for (const s of d.sessions) { const k = weekKey(s.date); c[k] = (c[k] || 0) + 1; if (c[k] >= 3) return true; } return false; } },
  { key: 'comeback', name: 'Comeback', how: 'Beat your previous lap by 15 points or more.', test: d => d.sessions.some((s, i) => i > 0 && s.score - d.sessions[i - 1].score >= 15) },
  { key: 'drill_done', name: 'Did the drill', how: 'Mark a drill as practised.', test: d => d.sessions.some(s => s.drillDone) || (d.plan && d.plan.items.some(it => it.kind === 'drill' && it.done)) },
  { key: 'plan_week', name: 'Plan finished', how: 'Tick off every item in a weekly plan.', test: d => !!(d.plan && d.plan.items.length && d.plan.items.every(it => it.done)) },
  { key: 'floater', name: 'Floater', how: 'Pass the one-minute float or tread test with the camera.', test: d => Object.values(d.skills).some(e => e && e.how === 'app') },
  { key: 'water_safe', name: 'Water safe', how: 'All five water-safety skills signed off.', test: d => SKILL_KEYS.every(k => d.skills[k]) },
  { key: 'streak_4', name: 'Four-week streak', how: 'A lap every week for four weeks.', test: d => weekStreak(d.sessions, d.now) >= 4 },
];
const SKILL_KEYS = ['enter', 'float', 'turn', 'swim', 'exit'];

function earnedBadges(data) {
  const d = Object.assign({ sessions: [], skills: {}, plan: null, now: new Date() }, data);
  return BADGES.filter(b => { try { return !!b.test(d); } catch (e) { return false; } }).map(b => b.key);
}

if (typeof module !== 'undefined') { const s = require('./scoring.js'); global.weekKey = s.weekKey; global.weekStreak = s.weekStreak; module.exports = { BADGES, SKILL_KEYS, earnedBadges }; }
