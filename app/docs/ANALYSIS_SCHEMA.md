# SafeDive Coach: analysis record (JSON)

`report.js` turns one analysed lap into this record. "Copy as JSON" on the Results screen puts it on the clipboard; `test/report.test.js` checks the shape. The app never sends it anywhere; it exists so a coach, a spreadsheet or a future version can read a lap without the app.

## Schema

```jsonc
{
  "app": "SafeDive Coach",
  "version": "0.2.0",
  "created": "2026-10-14T18:05:12.345Z",       // ISO 8601, when the record was made
  "swimmer": "Maya",                            // string or null
  "stroke": "backstroke",                       // backstroke | kick | freestyle | breaststroke (chosen by the parent, not detected)
  "clip": { "seconds": 12.5, "framesAnalysed": 100, "sampleFps": 8 },   // up to 30 s, 8 or 4 fps depending on device speed
  "readability": {
    "readableFrac": 0.62,                       // frames with both shoulders and both hips above confidence 0.4
    "movingFrac": 0.48,                         // readable frames where the shoulders travel >= 0.35 torso-lengths/s
    "scoredSeconds": 6.0                        // movingFrac x seconds; the gate needs >= 1.0
  },
  "metrics": {
    "torsoAngleDeg": 16.4,                      // median over scored frames, 0 = flat, 90 = vertical; null if nothing scored
    "headLift": 0.21,                           // nose height above shoulders in torso lengths; null if the face was not seen
    "strokeRateSpm": 54                         // dominant wrist up-down frequency x 60; null if under 1.5 s of wrist data
  },
  "score": {                                    // null when refused
    "total": 89,
    "word": "Strong lap",                       // Strong lap >= 80, Getting there >= 55, else Work on this
    "parts": [
      { "key": "body",   "name": "Body line",     "points": 45, "max": 50, "value": "16 degrees from flat" },
      { "key": "head",   "name": "Head position", "points": 30, "max": 30, "value": "nose above shoulders by 0.21 body-lengths" },
      { "key": "rhythm", "name": "Stroke rhythm", "points": 14, "max": 20, "value": "54 strokes per minute" }
    ]
  },
  "issues": ["hips_slightly_low", "head_ok", "rhythm_slow"],   // one key per tip; drills.js maps keys to drills
  "tips": ["Body line is a little low. ...", "Head position looks right.", "Strokes are slow and stop-start. ..."],
  "refused": null,                              // or { "reason": "I could only see the swimmer's body in 14% of the video. ..." }
  "timeline": [                                 // one entry per analysed frame
    { "t": 0.0,   "angle": null, "moving": false },
    { "t": 0.125, "angle": 17.2, "moving": true }
  ]
}
```

## Confidence

There is no per-metric confidence in 0 to 1 because we could not measure one honestly. What the record carries instead:
- `readability.readableFrac` is the single best confidence signal we have: below 0.30 the app refuses outright.
- `metrics.headLift` and `metrics.strokeRateSpm` are `null`, and their parts score half marks, when the data was not there, rather than a number with a low confidence attached.
- `timeline` lets a reader see exactly which frames the medians came from.

## Timestamps for clips that show an issue

The template asked for 3 to 5 clip ranges per issue. The record gives the raw material (`timeline`) instead of ranges; the Results screen's scrubber and chart are the interactive version. A consumer can find the worst stretch as the longest run of `moving: true` frames with `angle` above 30.

## What to film next (checklist the app shows on refusal)

1. Side of the pool, not the end.
2. Phone near water level.
3. 3 to 5 m away, landscape.
4. Start after the push-off, stop before the wall.
5. One swimmer in the frame.
6. Backstroke, back float or kick on a board if freestyle keeps getting refused.

## Example (abridged real run, backstroke clip 0389 through the Node harness)

```json
{ "stroke": "backstroke", "clip": { "seconds": 4.5, "framesAnalysed": 45, "sampleFps": 10 },
  "readability": { "readableFrac": 0.33, "movingFrac": 0.22, "scoredSeconds": 1.0 },
  "metrics": { "torsoAngleDeg": 16, "headLift": 0.3, "strokeRateSpm": 48 },
  "score": { "total": 89, "word": "Strong lap" }, "issues": ["hips_slightly_low", "head_ok", "rhythm_ok"], "refused": null }
```
