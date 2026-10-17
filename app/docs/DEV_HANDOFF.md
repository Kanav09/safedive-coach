# SafeDive Coach: developer handoff

No server, so no HTTP API. The "API" is six plain-script modules with pure functions where possible. Everything runs from `index.html` with classic `<script>` tags; there is no build step and no framework, so a judge can open any file and read it top to bottom.

## Run, test

```
cd app
node tools/serve.js 8765          # dev server: range requests (video seeking) + cross-origin isolation (multi-threaded wasm)
npm test                          # metrics, scoring, report JSON, drills/examples integrity
python3 test/dump_frames.py       # once: decode the six sample clips to raw frames (needs opencv-python)
node test/run_clips_yolo.js       # the shipped JS pipeline over real clips, prints one row per clip
```

Any static host works in production as long as it sends `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (otherwise the model runs single-threaded, about 3x slower) and serves `.wasm` as `application/wasm`.

## Modules

| File | Exports (browser globals / Node `module.exports`) | Pure? |
|---|---|---|
| `js/pose_yolo.js` | `YoloPose(ort, modelUrlOrBytes, inputSize).load()`, `.run(w, h, getPixels) -> [{score, box, keypoints[17]}]`, `YoloPose.decode`, `YoloPose.iou` | yes except `load()` |
| `js/metrics.js` | `frameMetrics(kps) -> {torsoAngle, hipDrop, headLift, wristY, torsoLen, shX, shY} | null`, `markMoving(frames, fps)`, `strokeRate(series, fps)`, `clipSummary(perFrame, fps)`, `KP_THR` | yes |
| `js/scoring.js` | `scoreClip(summary, stroke, fps) -> {ok, score, parts, tips, issues} | {ok:false, reason}`, `scoreWord`, `levelFor`, `weekStreak`, `THRESHOLDS`, `STROKES` | yes |
| `js/drills.js` | `DRILLS`, `NO_DRILL`, `drillFor(issueKey)` | data |
| `js/examples.js` | `EXAMPLES` | data |
| `js/draw.js` | `drawSkeleton(ctx, kps, {target, scale})`, `drawLabel`, `drawAngleChart`, `drawReadabilityStrip`, `drawHistoryChart`, `drawStudyChart` (each chart returns a hit-test function) | canvas only |
| `js/report.js` | `resultToJSON(run, fps)`, `makeReportCard(run, fps) -> canvas`, `APP_VERSION` | JSON part yes |
| `js/app.js` | `window.SafeDive = {analyze, show, lastRun, loadSessions, saveSessions}` | no (DOM) |

`getPixels(nw, nh)` is the one contract between the model and its caller: return RGBA bytes of the source drawn at `nw x nh`. The browser does it with a canvas (`pixelsFrom` in app.js); Node does a nearest-neighbour resize of raw RGB (`makeGetPixels` in the harness).

## Mock record

See `docs/ANALYSIS_SCHEMA.md`. To fabricate one for UI work without a clip, open the console on the Results screen and build `lastRun` as `test/report.test.js` does, then call `renderResults()`; `window.SafeDive.show('results')` first so the charts have a width.

## Acceptance tests

Automated (`npm test`): metric geometry including the moving filter's gap tolerance; scoring bands, refusal paths and streak maths; JSON record shape; every issue key has a drill; every example image exists. End to end (`node test/run_clips_yolo.js`): the six sample clips must come out 50 / refused / refused / refused / 89±2 / 47 (distress, three freestyle, backstroke, treading).

Manual, before any release, on a real phone over Wi-Fi (`http://<laptop-ip>:8765/`):
1. First open shows the consent sheet; Continue is disabled until the box is ticked.
2. Home hero gets a skeleton within a few seconds of the page going idle.
3. Record a 10 s backstroke clip in the app; a score appears in under 90 s; the readability strip fills left to right.
4. Scrubber and chart cursor stay in sync; target line toggles.
5. Drill opens and returns; Score another lap returns Home with stats updated.
6. Save report card opens the share sheet (or downloads on desktop); Copy as JSON shows "Copied".
7. Progress shows the lap; tapping the bar shows the detail card.
8. Delete all in Settings empties everything; consent is kept.
9. Network tab shows no requests during analysis.

## Performance constraints

- Clip: first 30 s analysed. Sampling: 8 fps, or 4 fps when the warm-up frame takes over 450 ms.
- Model: YOLO11n-pose, 640 px letterbox, 12 MB download once, then cached by the browser.
- Measured: 370 ms/frame single-threaded wasm on a 2024 MacBook (Node), about 1 s/frame in a memory-starved Chrome with 4 threads, 6 s/frame with 1 thread. A 15 s clip is 120 frames at 8 fps.
- Memory: per frame we keep 17 keypoints (not pixels). One best-frame canvas at video resolution. Fine on phones.
- Upgrade path: set `POSE_MODEL` to `yolo11s-pose-640.onnx` or a 960 px export (in `feasibility/models_extra/`) and `POSE_INPUT` accordingly; with WebGPU (`ort.env` executionProviders) the medium model becomes affordable and swimming readability roughly triples.

## Release checklist

- [ ] `npm test` green; harness numbers unchanged or explained in `feasibility/RESULTS.md`.
- [ ] Manual phone pass above on one iPhone and one Android.
- [ ] Privacy: network tab clean; Settings copy matches `docs/PRIVACY.md`.
- [ ] Accuracy wording on the About screen matches the latest harness run.
- [ ] Thresholds (`THRESHOLDS` in scoring.js) unchanged since the last instructor check, or re-checked.
- [ ] `APP_VERSION` bumped in report.js and package.json; README "Run it" still correct.
- [ ] Licence notes present (YOLO11 AGPL-3.0, onnxruntime-web MIT); photos are ours.

## v0.4 additions (2026-10-17)

New files, each with one job and a plain-Node unit test where it has pure logic:

| File | Job | Test |
|---|---|---|
| `js/store.js` | everything kept in `localStorage`: swimmers, laps, skills, plan, settings; one-time migration of v0.2 laps | `test/store.test.js` |
| `js/badges.js` | ten badges, computed from stored data (never stored) | `test/badges.test.js` |
| `js/safety.js` | the five Red Cross water-competency skills; `floatTest()` times a float or tread from per-frame metrics, forgiving two-second gaps | `test/safety.test.js` |
| `js/plan.js` | a three-item week from one scored lap; `.ics` export | `test/plan.test.js` |
| `js/share.js` | a lap packed into `#lap=` (base64url JSON, numbers only) and back | `test/share.test.js` |
| `js/live.js` | live camera loop; pure `liveState` / `liveCue` / `HoldCounter`; browser class `LiveCoach` | `test/live.test.js` |
| `draw.js` (+) | `drawDial` (body line against the water), `drawCompareChart`, `drawSafetyCard` | visual |
| `sw.js` | service worker: heavy files cache-first, everything else network-first with cache fallback | manual |
| `assets/icon*.{svg,png}` | the mark; PNGs rendered from the SVG with headless Chrome + sips | – |

Screens: `home`, `live`, `safety`, `floatresult`, `examples`, `guide`, `analyze`, `results`, `drill`, `progress`, `compare`, `evidence`, `settings`; tabs Score / Live / Safety / Progress / Learn. `?screen=name` opens any of them; `?sample=path&mode=float` runs the float test on a clip.

Things that need a real device to finish testing: the live camera (Chrome asks for permission; the laptop webcam works for the dial), the float test with a swimmer, the share sheet on iOS, and the install banner on a phone. During development, the service worker can serve stale files after an edit: in DevTools > Application > Service Workers tick "Update on reload", or unregister it.
