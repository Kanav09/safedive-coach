// SafeDive Coach: one drill per coaching point. Standard learn-to-swim drills, written for a parent on the deck.
// scoring.js returns `issues` (short keys); the results screen looks each key up here.

const DRILLS = {
  hips_low: {
    name: 'Press the T',
    why: 'When the chest presses down, the hips float up. The body works like a seesaw around the lungs.',
    steps: [
      'Push off the wall face down, arms stretched forward, and glide.',
      'Lean the chest down into the water, as if pressing a T-shirt logo toward the bottom.',
      'Feel the hips rise. Add a small, steady kick from the hips.',
      'Lift the head to breathe only when needed, then press the chest again.',
    ],
    reps: '6 glides of about 5 seconds, resting at the wall between each.',
  },
  hips_slightly_low: {
    name: 'Kick on your back, hands on thighs',
    why: 'Kicking on the back with no arms makes the legs do the work and keeps them close to the surface.',
    steps: [
      'Float on the back, hands resting on the thighs, ears in the water.',
      'Kick small and fast from the hips. Toes just break the surface, like boiling water.',
      'Keep the tummy up. If the hips drop, look straight up and push the belly toward the sky.',
    ],
    reps: '4 lengths of a short pool, or 4 x 20 seconds.',
  },
  head_high: {
    name: 'Look at the bottom',
    why: 'A lifted head pushes the hips down. Eyes to the bottom keeps the whole body level.',
    steps: [
      'Push off and glide with the face in the water, eyes looking straight down.',
      'Keep the water line around the hairline, not the forehead.',
      'To breathe, turn the head to the side with one ear still in the water. Do not lift.',
    ],
    reps: '8 glides, then try one slow lap keeping the eyes down.',
  },
  head_low: {
    name: 'Hairline check',
    why: 'A buried head drags the shoulders down and makes breathing late and rushed.',
    steps: [
      'Stand in shallow water and put the face in so the water sits at the hairline.',
      'Push off and glide holding that same line.',
      'Swim slowly and ask a helper to call out "hairline" each time it looks right.',
    ],
    reps: '6 glides, then 2 slow laps.',
  },
  face_unseen: {
    name: 'Film from the side',
    why: 'The app can only judge the head when it can see the face. This is a filming fix, not a swimming fix.',
    steps: [
      'Stand on the side of the pool, not the end, around 3 to 5 metres away.',
      'Crouch so the phone is close to water level.',
      'Record one lap with nobody else between the phone and the swimmer.',
    ],
    reps: 'One clip, then score it again.',
  },
  rhythm_slow: {
    name: 'Catch-up with a kickboard',
    why: 'Holding a board between strokes teaches the arms to keep moving instead of pausing.',
    steps: [
      'Hold a kickboard out front with both hands, face in the water, kicking gently.',
      'Pull with one arm all the way round and put the hand back on the board.',
      'Pull with the other arm. No pause longer than a breath between arms.',
    ],
    reps: '4 lengths of a short pool.',
  },
  rhythm_fast: {
    name: 'Reach and count',
    why: 'Short, fast arms burn energy and go nowhere. Fewer, longer strokes per lap is the goal.',
    steps: [
      'Swim one length and count the strokes.',
      'Swim it again reaching further forward on every stroke, trying for 2 fewer strokes.',
      'Keep the kick going so the reach does not stall the body.',
    ],
    reps: '4 lengths, counting each one.',
  },
};

// Points that need no drill: the scorer still reports them so the parent sees what is right.
const NO_DRILL = new Set(['body_flat', 'head_ok', 'rhythm_ok']);

function drillFor(issueKey) { return NO_DRILL.has(issueKey) ? null : (DRILLS[issueKey] || null); }

if (typeof module !== 'undefined') module.exports = { DRILLS, NO_DRILL, drillFor };
