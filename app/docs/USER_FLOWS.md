# SafeDive Coach: user flows and navigation

## Navigation map

Bottom tab bar with four tabs; every other screen is reached from a tab and returns to it.

```
Score (home) ──▶ Reading ──▶ Results ──▶ Drill
   │                             │
   │                             └──▶ Save report card / Copy as JSON
   └──▶ What the app sees (also from Learn)

Learn ─────▶ How to film ──▶ What the app sees

Progress ──▶ tap a lap ──▶ detail card ──▶ Drill

About ─────▶ Why trust the number ──▶ Privacy and settings ──▶ Delete all data

First run: consent sheet over Home (must be accepted once per browser).
```

## Flow 1: film or choose a clip and score it

Happy path
1. Home. Type the swimmer's name (optional), pick the stroke.
2. Tap "Record or choose a video". On a phone the system sheet offers the camera or the camera roll.
3. Reading screen: the model loads once (12 MB), then frames are read at 8 a second with a live skeleton, a readability strip, the current angle, the readable percentage and the time left.
4. Results: score, word, three parts with meters, the best frame, scrubber, chart, tips.
5. Tap the drill button on the first red tip. Read the drill. Back to results, then "Score another lap".

Error paths
- **Browser cannot open the clip** (HEVC on a desktop, corrupt file): after 12 s a message on Home names the iPhone "Most Compatible" setting. Nothing is saved.
- **Too few readable frames**: Results shows "Not scored" with the readable and travelling percentages and a link to How to film. Nothing is saved to history.
- **Analysis cancelled** (Cancel on the Reading screen): back to Home, nothing saved, the partially read clip is dropped.

## Flow 2: choose an existing clip (same as flow 1 from step 2)

The only difference is the source. The file input accepts any `video/*`; the app analyses the first 30 s.

Error paths
- **Clip over 30 s**: only the first 30 s are analysed; the frame count on Results makes this visible. Guidance in the Learn tab says 10 to 15 s.
- **Portrait clip**: supported; the stage and report card keep the aspect ratio.
- **Two swimmers**: the app follows the most confident detection each frame, which can switch people. The guide says one swimmer per clip; there is no in-app detection of this case yet.

## Flow 3: review progress and reopen a drill

Happy path
1. Progress tab. Level ring, name chips (if more than one swimmer), bar chart of the last 12 laps, list of all laps.
2. Tap a bar or a row. A detail card shows date, swimmer, stroke, score, body angle, readability and what was worked on.
3. Tap "Open the drill" on the card.

Error paths
- **No laps yet**: a one-line hint pointing at the Score tab; the ring is empty.
- **Private browsing / storage blocked**: scoring works, nothing persists; the stats stay at zero. (The app swallows storage errors by design.)
- **Delete all data**: a confirm dialog; on yes, stats and list reset, consent is kept.

## Flow 4 (learning): see what the model sees

1. Home or Learn, "See what the app sees".
2. Six real frames. Tap "Run the model on this frame"; the model loads if needed, runs on that frame in the browser, draws the skeleton and the torso line, and prints what it read next to what we measured when choosing the frame.
3. This is also the judge demo: it works with no video decoding at all.
