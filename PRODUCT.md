# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: a parent standing on a community-pool deck with a beginner swimmer (roughly 6 to 12 years old), filming one lap on their phone and reading the result right there, often with wet hands, in sunlight, with the child looking over their shoulder. They are not swimmers themselves and not technical. Their job: know whether the kid is improving between lessons and leave with one thing to practise. (Confirmed 2026-10-17.)

Secondary, not confirmed as design targets: the child, who wants a score and the next level; a swim instructor who might send a drill home. The personas in `app/docs/PRODUCT_BRIEF.md` (Priya, Dev, Ms. Okafor) are illustrative, not real interviewees.

Judges of the 2026 Congressional App Challenge are a real audience for the repository and the demo video, not for the app itself.

## Product Purpose

SafeDive Coach reads a short clip of a child swimming, on the phone, and scores one lap on body position: torso angle from flat (shoulders to hips), head lift, and stroke rhythm. It returns a 0 to 100 score, one plain-English tip and one named drill. It exists because lesson feedback is usually "good job" and parents already film laps they cannot read. Success is a parent who can name the one thing to practise ten minutes later, and an app that refuses to guess when the footage is poor.

## Positioning

Everything runs on the device: the pose model, the scoring, the history. No account, no upload, no server. A video of someone's child never leaves the phone, which an app with cloud inference cannot truthfully claim. The score comes with its evidence (the frames it used, the skeleton, the target line, the 31-clip study) rather than a number alone.

## Operating Context

- Used outdoors or in a humid indoor pool hall, one-handed, between laps. Sessions are short: film, wait under a minute, read, go back to watching the water.
- Entry is a URL in the phone browser (Safari or Chrome); it can be added to the home screen. During development it is served from a laptop on the same Wi-Fi.
- The project is a Congressional App Challenge entry. Judges may request an in-person source-code walkthrough, and "excellence of coding" is roughly a third of the rubric, so every file must be explainable by a student on the team. No build step, no framework, no bundler is a deliberate consequence.
- Companion research: the SafeDive drowning-detection project (same skeleton-keypoint approach, accepted URTC paper), from which the filming footage and the keypoint-to-geometry idea come.

## Capabilities and Constraints

- Input: one clip, recorded in the app or chosen from the camera roll, 10 to 30 s of one lap; longer clips are capped at 30 s. Stroke is chosen by the parent, never detected.
- Model: YOLO11n-pose, ONNX, run by onnxruntime-web (wasm, multi-threaded when the server sends COOP/COEP headers). 4 to 8 analysed frames per second; about 0.4 s a frame on a 2024 laptop. Upgrade path is a larger model over WebGPU, not a server.
- Scoring: 50 points body line, 30 head position, 20 rhythm. A frame counts only when both shoulders and both hips are confidently seen; frames where the swimmer is not travelling (standing at the wall) are ignored. The app refuses to score when the torso is readable in under 30% of frames or under one second of travel.
- Measured limits, must not be overstated: freestyle filmed from standing height is mostly unreadable with the phone-size model (7 to 18% of frames); backstroke, back float, kicking on a board and anything vertical read well (treading 77 to 87%). Thresholds were tuned on one pool, one swimmer, 31 clips: they separate flat from vertical reliably; head lift and rhythm are starting points.
- Storage: per lap only date, first name if typed, stroke, score, body angle, readable %, issue keys, in `localStorage`. Video and keypoints live in memory until the tab closes. "Delete all" is in Settings.
- Not in scope, by decision: live camera analysis, stroke classification, roll or symmetry metrics, cloud accounts, multi-swimmer tracking, drowning detection. The app is a swim-form helper, not a safety device.
- Terminology: lap, body line, readable, refuse, drill, levels Tadpole / Minnow / Otter / Dolphin / Shark, week streak.
- Team size: three or more students (exact count and names not yet recorded).
- Deadline: late October 2026 submission.

## Brand Commitments

The name "SafeDive Coach" stays. The current look is locked (confirmed 2026-10-17): the pool-deck palette (ink, deck, paper, water, rope red), the lane-rope stripe, the condensed display type and the nine-screen layout in `app/index.html` and `app/css/style.css` are the design. Future work refines it; it does not replace it or introduce a component library, framework or build step.

Voice as written so far: plain, short, honest about limits, speaks to the parent, never scares ("not a safety device", "an adult must always be watching the water"). The first-run consent sheet text in `app/docs/PRIVACY.md` is considered settled.

## Evidence on Hand

- Feasibility study: `feasibility/RESULTS.md`, per-clip and per-frame CSVs, summary and time-series figures, 31 labelled clips of one swimmer at one pool (self-filmed, staged). Torso-angle separation flat 5 to 36 degrees versus vertical 70 to 88 degrees, no overlap.
- Six real 540p sample clips in `app/samples/`; six real frames in `app/assets/examples/` with model-verified readings; the study data the app charts in `app/assets/study_clips.json`.
- Product documents in `app/docs/`: brief, MVP spec, user flows, wireframes, analysis JSON schema, privacy, dev handoff, usability test plan.
- Absent, do not fabricate: instructor agreement numbers, parent usability results, testimonials, swimmers other than the one filmed, any app-store or deployment claim, higher-resolution stills (originals are HEVC in the owner's Downloads and were not readable from the tooling).

## Product Principles

1. Refuse before you guess: a wrong score costs more trust than no score.
2. One tip, one drill: the parent leaves with a single thing to practise.
3. Show the evidence behind every number: frames, skeleton, target line, study.
4. The child's video never leaves the phone.
5. Every line must be explainable by a student in a walkthrough.

## Accessibility & Inclusion

Pool-deck use sets the bar: large targets usable one-handed with wet fingers, readable in direct sunlight, nothing that depends on hearing. Copy at a reading level a parent skims. No formal standard has been adopted; none is required by the competition.
