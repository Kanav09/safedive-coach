# SafeDive Coach

Film one lap of your kid swimming. The app reads their body position with a pose model
that runs on the phone, scores the lap, and says the one thing to fix. Nothing is uploaded.

Built for the 2026 Congressional App Challenge by the SafeDive team. It grew out of our
drowning-detection research project: same idea (skeleton keypoints from video, then simple
geometry), pointed at swim lessons instead of emergencies.

What is in the app: score a lap; step through the frames the score used (skeleton, target line,
angle chart); one drill per tip; progress with levels and a streak; a filming guide built from our
own footage; "What the app sees", which runs the model live on real frames; the 31-clip study as a
chart you can tap; a first-run consent sheet; report card image and JSON export. Product documents
(brief, spec, flows, wireframes, schema, privacy, handoff, usability plan) are in `docs/`.

## Run it

```
node tools/serve.js 8765        # then open http://127.0.0.1:8765/ on a laptop,
                                # or http://<laptop-ip>:8765/ on a phone on the same Wi-Fi
npm test                        # unit tests for the scoring maths
python3 test/dump_frames.py    # one-time: decode the sample clips into raw frames (needs opencv-python)
node test/run_clips_yolo.js     # end-to-end: real pool clips through the shipped JS pipeline
```

No build step, no accounts, no server-side code. Works offline once loaded.

## How a lap gets scored

1. **Pose.** Each analysed frame goes through YOLO11-pose (ONNX, run by onnxruntime-web).
   Out come 17 body points with confidences. `js/pose_yolo.js` does the letterboxing,
   decoding and non-max suppression by hand so there is no black box.
2. **Numbers.** `js/metrics.js` turns the points into three things: torso angle from flat
   (shoulders to hips), head lift (nose relative to shoulders), and stroke rhythm (wrist
   up-and-down rate). A frame counts only if both shoulders and both hips are seen with
   confidence; a frame where the swimmer is not travelling (standing at the wall) is ignored.
3. **Score and tips.** `js/scoring.js` gives 50 points for body line, 30 for head position,
   20 for rhythm, and writes plain-English tips. If too little of the swimmer was readable, the
   app refuses to score and says how to film better. Thresholds live in one object at the top.
4. **Game layer.** Levels (Tadpole to Shark) by laps scored, week streaks, best score, history
   chart. Stored in the phone's localStorage only.

## Why YOLO and not MoveNet

We tested both on our own pool footage (`../feasibility/RESULTS.md`). MoveNet could read a
swimmer's torso in 0 to 33% of frames; YOLO11-pose read 72 to 100% on the same clips.
Swimmers are small in the frame and half under water, which MoveNet was never trained on.

## Files

| file | what it does |
|---|---|
| `index.html` | the screens: home, what the app sees, how to film, reading, results, drill, progress, about, settings |
| `css/style.css` | styling, phone-first, light only (it is read in sunlight); two-ink risograph look: paper, aqua, orange, black for words, green where the inks overprint. The system is written up in `../DESIGN.md` |
| `js/app.js` | screen logic, the analysis loop, results with scrubber, progress, consent |
| `js/draw.js` | skeleton, target line, readability strip, the three charts (each returns a tap hit-test) |
| `js/drills.js` | one drill per coaching point; `js/examples.js` the real frames for the live demo |
| `js/report.js` | JSON record (`docs/ANALYSIS_SCHEMA.md`) and the report-card image |
| `assets/` | six example frames from our own filming and `study_clips.json` (the 31-clip study) |
| `js/pose_yolo.js` | YOLO11-pose in the browser: preprocess, run, decode, NMS |
| `js/metrics.js` | keypoints to torso angle, head lift, stroke rate; moving filter; confidence gate |
| `js/scoring.js` | score, tips, levels, streaks |
| `models/yolo/*.onnx` | the pose model (exported from Ultralytics YOLO11, AGPL-3.0) |
| `vendor/ort/` | onnxruntime-web runtime and its WebAssembly |
| `tools/serve.js` | tiny dev server: HTTP range support (video seeking) + cross-origin isolation headers (multi-threaded WebAssembly) |
| `test/` | unit tests (metrics, scoring, report JSON, drills), `dump_frames.py` (clips to raw frames) and the Node end-to-end harness on real clips |
| `docs/` | product brief, MVP spec, user flows, wireframes, analysis schema, privacy, developer handoff, usability test plan |
| `samples/` | six short clips from our own filming, for demos and tests |

## Honest limits

- Freestyle from a deck-height phone is hard to read: the torso is under water most of the
  time. Backstroke, kickboard drills and breaststroke read far better. Film from the side,
  low, close.
- The thresholds are starting points from one pool. They need more swimmers.
- This is a swim-form helper, not a safety device. An adult must always be watching the water.
