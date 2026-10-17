// SafeDive Coach: water-safety skills and the camera float test.
// The five skills are the ones the American Red Cross calls "water competency": a child who can do all five
// has a real chance of saving themselves after an unexpected fall into deep water. Four are signed off by the
// parent watching; the float-or-tread minute can also be verified by the pose model (see floatTest below).

const SKILLS = [
  { key: 'enter', name: 'Enter deep water', text: 'Step or jump into water over their head and come back up to the surface.', how: 'parent' },
  { key: 'float', name: 'Float or tread for one minute', text: 'Stay at the surface, face out of the water, for a full minute. Floating on the back or treading both count.', how: 'camera', seconds: 60 },
  { key: 'turn', name: 'Turn around and find the way out', text: 'Turn a full circle in the water and spot the nearest exit.', how: 'parent' },
  { key: 'swim', name: 'Swim 25 yards to the exit', text: 'Any stroke, no stopping, to the wall or ladder about 25 yards (one short pool length) away.', how: 'parent' },
  { key: 'exit', name: 'Climb out without a ladder', text: 'Pull themselves out over the side of the pool.', how: 'parent' },
];

// The skill is 'stay at the surface for a minute, floating or treading'. What the camera can honestly check is that the
// swimmer's torso stays readable at the surface, continuously; the angle only says HOW they stayed up (flat = floating,
// upright = treading, in between = a leaning tread, which still counts: a third of one real treading clip sits there).
// A 2 s gap is forgiven because a splash hides the hips for a moment.
const FLOAT = { minSeconds: 60, flatMax: 35, uprightMin: 55, maxGapSeconds: 2.0 };

// Per-frame posture for the test: 'float' (body near flat), 'tread' (body upright), 'between', or null (nobody readable).
// All three non-null postures count as being at the surface.
function floatState(m) {
  if (!m) return null;
  if (m.torsoAngle <= FLOAT.flatMax) return 'float';
  if (m.torsoAngle >= FLOAT.uprightMin) return 'tread';
  return 'between';
}

// Whole test -> {held, longest, pass, readableFrac, mode}. Frames are frameMetrics() results sampled at `fps`.
// "Held" time is the longest run of float/tread frames allowing short gaps (a splash hides the hips for a moment),
// because a child treading water is not failing the test when the camera loses the hips for half a second.
function floatTest(perFrame, fps, minSeconds = FLOAT.minSeconds) {
  let longest = 0, run = 0, gap = 0, mode = null, modes = { float: 0, tread: 0 };
  for (const m of perFrame) {
    const st = floatState(m);
    if (st) { run += 1 + gap; gap = 0; if (st !== 'between') modes[st]++; }
    else if (run > 0 && gap < FLOAT.maxGapSeconds * fps) gap++;
    else { run = 0; gap = 0; }
    if (run > longest) longest = run;
  }
  const seconds = longest / fps;
  const readable = perFrame.filter(Boolean).length / Math.max(perFrame.length, 1);
  if (modes.float || modes.tread) mode = modes.float >= modes.tread ? 'float' : 'tread';   // 'between' frames count for time but do not vote
  return { seconds: +seconds.toFixed(1), pass: seconds >= minSeconds, readableFrac: +readable.toFixed(3), mode, minSeconds };
}

function skillsDone(entries) { return SKILLS.filter(s => entries && entries[s.key]).length; }

if (typeof module !== 'undefined') module.exports = { SKILLS, FLOAT, floatState, floatTest, skillsDone };
