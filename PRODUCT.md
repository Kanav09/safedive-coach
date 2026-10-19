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
- Model: YOLO11n-pose, ONNX, run by onnxruntime-web (wasm, multi-threaded when the server sends COOP/COEP headers). 4 to 8 analysed frames per second; about 0.4 s a frame on a 2024 laptop. A careful YOLO11s-pose (40 MB, on demand) is offered when a lap is refused for readability and as a setting; 960 px input was tested and rejected (feasibility/v04/RESULTS.md). Upgrade path beyond that is WebGPU, not a server.
- Scoring: 50 points body line, 30 head position, 20 rhythm. A frame counts only when both shoulders and both hips are confidently seen, the swimmer is travelling, and the body is not upright (steeper than 60° in the picture: standing, treading, at the wall; v0.4, from the 87-clip study). Keypoints are followed on one swimmer and median-smoothed over three samples. The app refuses when the torso is readable in under 30% of frames or under one second of actual swimming, says when what it saw was mostly upright, and refuses a lap whose scored body line is steeper than 45° as a camera-position problem (high, end of lane, behind) rather than coaching 'hips sinking' (24-clip ladder, feasibility/v04/RESULTS.md).
- Measured limits, must not be overstated: freestyle filmed from standing height is mostly unreadable with the phone-size model (7 to 18% of frames); backstroke, back float, kicking on a board and anything vertical read well (treading 77 to 87% in the 31-clip study with the larger model; the shipped phone model read 99% of the treading sample clip in the app's own harness, test/run_clips_yolo.js, October 2026). Across the 87-clip study (feasibility/v04/RESULTS.md) about four in ten deck-filmed swimming clips pass the readability gate. Body-line bands are set against published trunk-incline studies (10 to 15° adults, 2 to 14° novices) shifted for a deck-height phone, with a ±5° error bar shown; head lift and rhythm bands are our own and unvalidated (feasibility/v04/LITERATURE.md).
- Storage (`js/store.js`): swimmers (id, name, stamp colour), laps (date, swimmer, stroke, score, body angle, readable %, issue keys, part points, the body-angle line at the sample rate, drill practised), skills per swimmer, one plan, settings, all in `localStorage`. Video and keypoints live in memory until the tab closes. "Delete everything" and per-swimmer removal are in Settings.
- v0.5 (2026-10-19, owner said the app "looks mid"): a one-tap "Try our sample lap" (the bundled backstroke clip, the only one of the six samples the v0.4 rules score; it runs the real pipeline and is never saved to a swimmer), a last-lap card on the home screen (score, verdict, trend against the lap before, tap for history), a "What to try" list on every refusal chosen by the reason, drawn badge glyphs, a framing guide on the Live tab before the camera is on, the score counting up once, faint paper grain, and shorter copy throughout. No new claims.
- v0.4 (2026-10-17, owner asked for "an actual app, with twists"): live camera coaching (same model, a body-line dial against the water line, one cue, optional spoken cue; nothing recorded), water-safety skills (the five American Red Cross water-competency skills, four signed off by a parent, the one-minute float/tread checked by the camera or from a clip), swimmer profiles, badges computed from stored data, a one-week practice plan with calendar export, compare two laps, share a lap as a link with no server (numbers in the URL fragment), installable offline (service worker caches the model).
- Still not in scope, by decision: stroke classification, roll or symmetry metrics, cloud accounts, multi-swimmer tracking in one frame, drowning detection. The app is a swim-form helper and a skills record, not a safety device: the live coach and the float test share the model's limits and say so.
- Terminology: lap, body line, readable, refuse, drill, plan, levels Tadpole / Minnow / Otter / Dolphin / Shark, week streak, badges, skills (water safety), float test, live coach, swimmer (profile, drawn as a round ink stamp with the initial).
- Team size: three or more students (exact count and names not yet recorded).
- Deadline: late October 2026 submission.

## Brand Commitments

The name "SafeDive Coach" stays. On 2026-10-17 the owner lifted the earlier design lock: the v0.2 pool-deck look (ink/deck/paper/water/rope palette, lane-rope stripe, condensed display type) is being replaced with a new visual identity because it read as a generic, template-like card app. The replacement keeps the no-framework, no-build-step rule: plain HTML, one CSS file, classic script tags. No component library (shadcn was used as a reference for button, input, tabs, dialog, progress and toast behaviour, ported by hand). v0.4 grew the app to thirteen screens behind five tabs: Score, Live, Safety, Progress, Learn.

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
