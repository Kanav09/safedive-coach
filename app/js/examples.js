// SafeDive Coach: real frames from our own filming at the Weldon Ridge community pool (summer 2026),
// used by the "What the app sees" screen. Tapping one runs the pose model on it, live, in the browser.
// Each frame was chosen by running the shipped phone model over every 4th frame of its clip and keeping the one it read
// most confidently (scratch script, October 2026). `expect` is what the model read then, shown after it runs again as a check.

const EXAMPLES = [
  { id: 'flat_float', src: 'assets/examples/flat_float.jpg', title: 'Flat on the water',
    caption: 'Back float, filmed from the side at water level. Shoulders and hips both visible: the app reads this almost every frame.',
    expect: 'the model read 32° from flat here. A relaxed back float sits around 30°; a strong lap gets under 15°. Either way, flat.' },
  { id: 'backstroke_lap', src: 'assets/examples/backstroke_lap.jpg', title: 'Backstroke lap',
    caption: 'Same pool, phone on the deck. The swimmer is small but the back stays on the surface, so the torso still reads.',
    expect: 'the model read 20° here. Across the whole clip the lap scored 90.' },
  { id: 'treading', src: 'assets/examples/treading.jpg', title: 'Treading water',
    caption: 'Vertical and calm. The app reads treading in almost every frame because the whole torso is above the water line.',
    expect: 'the model read 85°, fully upright. Not a swimming fault, just not a lap.' },
  { id: 'body_dropped', src: 'assets/examples/body_dropped.jpg', title: 'Body dropped',
    caption: 'Hips sunk, head back, arms pressing down. This is what a struggling swimmer looks like to the model.',
    expect: 'the model read 78°, steeper than any swimming posture. The app counts a frame like this as upright and never scores it; if most of a clip looks like this it refuses and says why.' },
  { id: 'standing_wall', src: 'assets/examples/standing_wall.jpg', title: 'Standing at the wall',
    caption: 'Upright, but not swimming. The app notices the shoulders are not travelling and ignores frames like this.',
    expect: 'the model read 88°, but the shoulders are not travelling, so a lap scorer throws this frame away. A rest at the wall never lowers the score.' },
  { id: 'deck_freestyle', src: 'assets/examples/deck_freestyle.jpg', title: 'Freestyle from the deck',
    caption: 'Face down, splash over the hips, phone held high. Hard for any pose model. Our fix is in the filming guide.',
    expect: 'a person, but no readable torso. The model found a torso in only 8 of 55 frames of this clip, so the app refused to score it.' },
];

if (typeof module !== 'undefined') module.exports = { EXAMPLES };
