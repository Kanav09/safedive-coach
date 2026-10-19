# SafeDive Coach: MVP product and ML specification

## Feature list

| Priority | Feature | Status (Oct 14, 2026) |
|---|---|---|
| Must | Choose or record a clip, analyse on device, score 0 to 100 | Built; verified end to end in Chrome 2026-10-17 |
| Must | Confidence gate: refuse when torso readable < 30% or scored swimming < 1 s | Built, tested on real clips |
| Must | Three parts: body line (50), head position (30), stroke rhythm (20) | Built, unit tested |
| Must | One plain tip per part, drill for each fixable tip | Built (7 drills) |
| Must | Consent sheet, nothing uploaded, delete all data | Built |
| Should | Step through frames with skeleton, target line, angle chart | Built |
| Should | Progress: levels, streak, per-swimmer filter, tappable history | Built |
| Should | Filming guide with real good and hard frames | Built |
| Should | Report card image and JSON export | Built |
| Could | Live "what the app sees" demo on real frames | Built |
| Could | Larger model via WebGPU for freestyle readability | Not started; same code path, swap the ONNX file |
| Could | Share a clip with an instructor for review | Replaced by "share a lap as a link": numbers only, in the URL fragment, no server (v0.4) |
| v0.4 | Live coach: camera, body-line dial, one cue, optional voice | Built (`js/live.js`); needs a phone or laptop camera to test |
| v0.4 | Water safety: five Red Cross skills, parent sign-off, camera or clip float test | Built (`js/safety.js`); float test unit tested, camera path needs a pool |
| v0.4 | Swimmer profiles, badges, weekly plan + calendar, compare two laps | Built (`js/store.js`, `js/badges.js`, `js/plan.js`, `draw.js`) |
| v0.4 | Installable, works offline (service worker caches the model) | Built (`sw.js`, `manifest.json`, icons) |
| v0.5 | Sample lap button, last-lap card, "what to try" on refusals, badge glyphs, live framing guide | Built 2026-10-19 (`app.js` `runSample`, `BADGE_ICONS`; the sample lap is never saved) |

## User stories with acceptance criteria

**US1. Score a lap.** As a parent, I want to pick a clip and get a score, so that I know how the lap went.
- Given a readable 10 to 30 s clip, when I choose it, then within 90 s on a recent phone I see a score, three parts and at least one tip.
- Given a clip longer than 30 s, then only the first 30 s are analysed and the screen says so by its frame count.
- Given the browser cannot decode the clip, then within 12 s I see a message naming the iPhone "Most Compatible" setting.

**US2. Be told when it cannot score.** As a parent, I want the app to refuse rather than guess, so that I never practise the wrong thing.
- Given torso readable in under 30% of frames, then no score is saved, the reason is shown with the readable and travelling percentages, and a link to the filming guide.
- Given under 1 s of travelling frames (kid standing at the wall), then the same refusal with the "start after the push-off" wording.

**US3. Know what to practise.** As a parent, I want one drill, so that the next session has a plan.
- Given a scored lap with at least one fixable tip, then the first fixable tip has a "Drill" button that opens a drill with a why, 3 to 4 steps and a rep count.
- Given a perfect lap, then all tips are green and there is no drill button.

**US4. See why.** As a curious parent, I want to scrub through the lap, so that I believe the number.
- Given a scored lap, when I drag the slider, then the frame, its skeleton, the angle and whether it was scored update; tapping the chart moves the slider.
- Given "Show target line" is on, then a dashed line at the target angle is drawn from the shoulders on readable frames.

**US5. Track progress.** As a swimmer, I want levels and a streak, so that I keep going.
- Given 3 scored laps, then the level is Minnow and the ring shows progress to Otter. Given two or more swimmer names, then chips filter the chart and list.

**US6. Keep my data mine.** As a parent, I want nothing uploaded and a delete button, so that I can trust it with my child.
- Given any clip, then no network request carries video or frames (verifiable in the browser's network tab). Given "Delete all", then the stats read zero and the list is empty.

## ML capabilities

**What the model does.** YOLO11n-pose (Ultralytics, exported to ONNX, 12 MB) finds people and 17 COCO keypoints per frame. onnxruntime-web runs it in WebAssembly, multi-threaded when the page is cross-origin isolated. A second, careful model (YOLO11s-pose, 40 MB, same code path) is fetched on demand: it reads 16 of 41 study clips more than 5 points better and treading water much better, at twice the time, so a lap refused for readability offers it and Settings can make it the default.

**What we compute (metrics.js, track.js).** The swimmer is followed from frame to frame (nearest to their last position, else the most confident person) and their keypoints are median-smoothed over three samples. Torso angle from flat (shoulders midpoint to hips midpoint), hip drop, head lift (nose relative to shoulders in torso lengths), wrist height series. Frames count only when both shoulders and both hips are above confidence 0.4. Frames where the shoulders do not travel at least 0.35 torso-lengths per second, or where the torso is steeper than 60° (upright: standing, treading, at the wall), are never scored. Stroke rate is the dominant frequency of the wrist series between 0.3 and 3 Hz.

**What we deliberately do not claim.** Stroke type (asked, not detected), roll symmetry (needs a head-on or underwater view), kick rate (feet rarely visible), breathing pattern (needs a face-tracking model). The template's "overall skill score 0 to 100 with beginner/intermediate/advanced category" is replaced by a lap score with a word (Strong lap / Getting there / Work on this), because the data supports judging a lap, not a swimmer.

**Input requirements.** Side-on, phone a little above the water (crouching on the deck, not standing, not at the surface), 3 to 5 m, landscape, one swimmer, 1080p or 720p at 30 fps. The app samples 8 frames a second (4 on slow devices), up to 30 s. Evidence for the camera height: feasibility/v04/RESULTS.md, third batch.

**Labelled data.** 87 clips with a class label only (46 swimming, 14 treading, 14 acted struggling, 13 of them from the web), no keypoint labels, plus 31 full-resolution originals. Used to pick the model, set the readability gate, find the upright-frame rule and choose the smoothing. See `feasibility/RESULTS.md` (31-clip study), `feasibility/v04/RESULTS.md` (87-clip study), `feasibility/v04/LITERATURE.md` (published thresholds) and the About screen.

**Outputs.** `docs/ANALYSIS_SCHEMA.md`.

## Architecture

```
phone camera / camera roll
        │  (file never leaves the page)
        ▼
<video> element ──seek 8 fps──▶ canvas ──RGBA──▶ pose_yolo.js (letterbox, ONNX run, decode, NMS)
                                                        │ 17 keypoints
                                                        ▼
                                                 metrics.js  (angle, head lift, wrist series, moving filter)
                                                        │ clip summary
                                                        ▼
                                                 scoring.js  (gate, 50/30/20 score, tips, issue keys)
                                                        │
                        ┌───────────────────────────────┼───────────────────────────┐
                        ▼                               ▼                           ▼
                 results screen (draw.js)        drills.js (one drill)      report.js (JSON, PNG)
                        │
                        ▼
                 localStorage: {date, swimmer, stroke, score, torsoAngle, readable, issues}
```

**On-device vs cloud.** Cloud would allow the bigger model (60% vs 20 to 30% readability on swimming frames) and a shared dataset, at the cost of uploading video of children, a server bill, consent complexity and an internet connection at the pool. For a parent tool the trust argument wins; the upgrade path that keeps the promise is WebGPU with a larger ONNX file, which is a one-line change in `app.js` (`POSE_MODEL`, `POSE_INPUT`).

## RICE and effort

| Feature | Reach (parents/mo) | Impact (1-3) | Confidence | Effort (days) | RICE |
|---|---|---|---|---|---|
| Score a lap + gate | 100 | 3 | 0.9 | 6 | 45 |
| One tip, one drill | 100 | 3 | 0.8 | 1 | 240 |
| Step through the lap | 60 | 2 | 0.8 | 1.5 | 64 |
| Progress and levels | 70 | 2 | 0.7 | 1 | 98 |
| Filming guide | 100 | 2 | 0.9 | 0.5 | 360 |
| Report card + JSON | 40 | 1 | 0.9 | 0.5 | 72 |
| Bigger model via WebGPU | 100 | 3 | 0.5 | 3 | 50 |

Reach is a guess for a single community pool over one summer. The scores are for ordering, not for anything else.
