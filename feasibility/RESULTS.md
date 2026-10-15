# SafeDive Coach feasibility test — pass 1 (2026-10-09)

**Question:** on real phone footage from the Weldon Ridge pool, does the body-angle
signal the app would score actually tell "flat body, swimming" from "body dropped /
vertical"?

**Setup:** 31 self-filmed clips from `drowning-detector/data/clips_labeled`
(16 normal swimming, 5 treading water, 10 distress; 1.6–14.6 s each, 540p).
Pose model: YOLO11s-pose (same 17 COCO keypoints MoveNet gives), imgsz 640,
keypoint counted as seen at confidence ≥ 0.5. Script: `torso_test.py`.
Outputs: `out/clips.csv`, `out/frames.csv`, `out/fig_summary.png`,
`out/fig_timeseries.png`, `out/overlays/` (skeleton frames), `out/sheet_*.jpg`.

## What came out

| class | clips | readable-torso frames (median) | clips passing 50% gate | median torso angle |
|---|---|---|---|---|
| swim | 16 | 17% | 2 | bimodal: 5–36° (truly swimming) or 78–88° (see below) |
| tread | 5 | 87% | 4 | 70–87° |
| distress | 10 | 35% | 4 | 70–88° (7 clips), 29–49° (3 clips) |

## Verdict in plain words

1. **The angle itself is NOT noise.** When the model can see shoulders and hips,
   a swimmer lying flat reads 5–36° and a vertical body reads 70–88°. No overlap.
2. **The real problem is readability, not the metric.** In freestyle the torso is
   under the water and splash hides the hips, so the model reads the torso in only
   ~17% of frames. Only 2 of 16 swimming clips pass a 50% confidence gate.
3. **Six "swimming" clips score as vertical (78–88°) and that is a trap.** Looking
   at the overlay frames, the only readable frames in those clips are the swimmer
   standing at the wall before/after the lap. A naive scorer would tell a parent
   "hips sinking" on a perfectly good lap. The app must throw out standing/wall
   frames (no horizontal travel) before scoring.
4. Treading water is read almost perfectly (87–100% of frames), and the vertical
   distress clips too. Back-float / backstroke-style frames read flat and clean
   (clips 0388, 0389, 0397).

## What this means for the decision

Not a "switch to Spot It" result, and not a clean green light either. Coach is
viable **if** scoring is restricted to (a) frames where the swimmer is actually
moving across the pool and (b) strokes where the torso surfaces (backstroke,
breaststroke glide, kicking on a board) or footage shot from a lower, more
side-on angle than these deck clips. Freestyle from a deck phone is mostly
unreadable with a general pose model at 640 px.

## Pass 2 (launched same day)

Re-run with the bigger YOLO11m-pose model at 1280 px, keypoint threshold 0.4,
plus shoulder position per frame so standing frames can be excluded by lack of
horizontal travel. Output in `out_hi/`. If readability on the swim clips does
not climb well above 50%, Coach needs new footage shot for it (side-on, waist
height, backstroke/kickboard drills) before any screens are built.

## Pass 3 (2026-10-09 night): which pose model can the APP use?

The spec said MoveNet (TensorFlow.js). Tested on the same six clips, run through the app's
own JavaScript (`app/test/run_clips*.js`), swimmer torso readable in:

| model | run where | swimming clips | treading | distress | speed (Mac, 1 thread) |
|---|---|---|---|---|---|
| MoveNet Lightning, whole frame | Node, tfjs | 0% | 1% | 14% | 0.9 s/frame |
| MoveNet Lightning, cropped to the person box | Node, tfjs | 0–21% | 33% | 25% | 0.9 s/frame |
| MoveNet Thunder, cropped | Node, tfjs | 13% | (stopped) | 36% | 3.5 s/frame |
| **YOLO11n-pose, ONNX in JS, 640 px** | Node, onnxruntime-web | 7–23% | **100%** | **72%** | 0.4 s/frame |
| YOLO11s-pose @640 (Python pass 1) | Python | 10–84% | 87–100% | 0–81% | |
| YOLO11m-pose @1280 (Python pass 2, partial) | Python | 53–63% | | | slow |

**Decision: MoveNet is out.** It is trained on people on land and cannot find a half-submerged
swimmer. YOLO11-pose, exported to ONNX and run with onnxruntime-web, reads the same clips the
Python prototype reads. The app now ships `models/yolo/yolo11n-pose.onnx` (12 MB) and
`js/pose_yolo.js` (letterbox, decode, NMS written by hand so the team can explain it).
Verified in Chrome: model loads in 1.3 s, finds the treading swimmer, torso angle 83°.

Open: n@640 vs n@960 vs s@640 trade-off (readability vs phone speed), running now
(`app/test/compare_models.sh`, log in `app/test/compare_models.log`).

## Blockers hit on this laptop (not app bugs)

- Chrome in this session cannot decode ANY video (even one it recorded itself); the Mac has
  9.4 of 10 GB swap in use. The app's video flow therefore has to be tried in a normal
  Chrome window or on a phone. Everything else was proven in Node + Chrome on still frames.
- iPhone .MOV files are HEVC; Chrome on this Mac cannot play them. The app now says so
  instead of hanging. Phones play their own HEVC fine, so this only matters on the laptop.

## Pass 4: model size for the app (same six clips, native 540p frames, 10 fps, app JS pipeline)

| model | readable on swim clips | treading | distress | ms/frame (Mac, 1 wasm thread) |
|---|---|---|---|---|
| **YOLO11n @640 (shipped)** | 18–31% | 99% | 71% | 360 |
| YOLO11n @960 | 7–28% | 94% | 54% | 820 |
| YOLO11s @640 | 8–29% | 100% | 69% | 1010 |

Bigger input or bigger model did NOT help in the browser pipeline and cost 2–3x the time, so
the app ships the nano model at 640. With the gap-tolerant moving filter the scores now behave
as intended on real clips: flat backstroke lap (0389) = 90, vertical struggling body (0377) = 50,
treading (0392) = 47, kid standing at the wall (0380) = refused, not scored.

Freestyle-from-the-deck clips (0384, 0388) are refused for too few readable frames. That is the
honest state: the app scores backstroke / kick / vertical body well; freestyle needs closer,
side-on footage. Extra ONNX exports kept in feasibility/models_extra/ (not shipped).

## Pass 2 finished (2026-10-10 early): YOLO11m-pose @1280, kp thr 0.4, same 31 clips (540p)

| class | median readable torso frames | clips passing the 50% gate |
|---|---|---|
| swim | 58% (pass 1: 17%) | 11 of 16 (pass 1: 2 of 16) |
| tread | 70% | 4 of 5 |
| distress | 64% | 7 of 10 |

So readability IS fixable with a bigger model and more pixels: swimming goes from mostly
unreadable to mostly readable. The browser app ships the nano model at 640 for speed, which
is why it still refuses deck-height freestyle. Upgrade path if phones are fast enough
(WebGPU): ship the s or m model and raise the input size; the code path is identical.
The vertical "swim" medians (0374, 0380/81, 0396-99) are still the kid standing at the
wall, which the app's moving-frame filter now drops. Full-resolution (1080p originals from
Downloads) run started next, results will land in out_fullres/.
