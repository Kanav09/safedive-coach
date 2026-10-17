# SafeDive Coach v0.4 backend study (2026-10-17)

**Question.** With 87 labelled clips instead of 6, what in the scoring pipeline is wrong, and what makes the body-line
reading more accurate without a bigger model? Companion files: `LITERATURE.md` (what the papers say), `DATASETS.md`
(what public data exists), `infer_cache.py` / `analyze_cache.py` (how to reproduce), `results/*.csv` (every number).

## Data
- 87 clips in `~/drowning-detector/data/clips_labeled`, 867 s in all: 46 normal swimming, 14 treading water, 14 acted
  distress (labels in `metadata.csv`), plus 26 unlabelled 8 s trims of the same web clips, excluded as duplicates.
  Sources: 57 self-filmed by the team (two sessions, one pool, one swimmer, 540p), 13 YouTube clips of other swimmers,
  4 web distress clips. Sampled at 8 frames a second: 6,818 frames per model configuration.
- 31 full-resolution (1080p HEVC) phone originals of the second self-filmed session, same sampling (`cache_fullres/`).

## Method
Stage 1 caches every detection the model makes per frame (all people, boxes, 17 keypoints with confidences).
Stage 2 replays `metrics.js` and `scoring.js` exactly (ported line for line) and tries, for each cached model:
which person to follow (most confident / largest / tracked), the keypoint confidence threshold (0.3 / 0.4 / 0.5),
temporal median smoothing of keypoints (off / 3 samples), and an upright-frame rule. Outputs per clip: readable
fraction, scored fraction, median body angle, frame-to-frame angle jitter, the gate decision, body points.

## Findings, shipped model (YOLO11n-pose at 640 px)

1. **Scored laps at 65–88° were not laps.** With the v0.3 rules, 16 of 41 swimming clips were scored and six of
   them read 64°, 78°, 86°, 87°, 87°, 88°: the only readable frames were the child standing or walking at the wall,
   and the shoulders still travelled enough to pass the moving filter. A parent would be told "hips are sinking"
   about a kid who was walking. No swimmer's trunk exceeds about 21° in the literature (30–35° in a deck-held phone's
   view), so a frame steeper than 60° cannot be swimming. **Rule added (`UPRIGHT_MAX = 60` in metrics.js):** such frames
   are counted but never scored, and when they are most of what was readable the app refuses with a new reason
   ("most of the time I could see the swimmer they were upright"). After the rule: 13 swimming clips scored, all
   between 4° and 49°; the four treading clips that had been "scored" now refuse for the right reason; 7 of 14 distress
   clips refuse as upright (the rest read 34–52°, acted struggling with the body low).
   Through the real browser pipeline (`app/test/run_clips_yolo.js`) the six sample clips went from
   50 / refused / refused / refused / 89 / 47 to refused (upright) / refused / refused / refused / **90** / refused (upright).
   The two wrong scores are gone and the one true lap is unchanged.

2. **Temporal median smoothing (3 samples) halves angle jitter.** Median frame-to-frame change in body angle on
   swimming clips fell from 8.1° to 3.9° (treading 3.0° to 1.3°) with no change in which clips pass the gate and
   no bias in the median angle. Shipped as `TRACK.smoothWin = 3` in `js/track.js`.

3. **Following one swimmer costs nothing and guards against bystanders.** At 8 samples a second the followed person
   jumped by more than 1.5 torso lengths between consecutive readable frames in 0% of pairs on this footage, so
   tracking changed no result here. It is kept (nearest-to-previous within one box diagonal, else most confident)
   because pools have bystanders and the data has few. `TRACK.maxJump = 1.0`.

4. **Keypoint threshold stays at 0.4.** 0.3 raised median readability on swimming clips from 0.25 to 0.28 and scored one
   more legitimate clip (29.9°), but also admitted more standing frames (one more 79° clip before the upright rule);
   0.5 dropped readability to 0.21 and lost three scorable clips. 0.4 is the safe middle.

5. **The honest readability number.** Median readable fraction on swimming clips filmed from the deck is 0.25–0.29;
   about four in ten swimming clips pass the 30% gate. Self-filmed session 2 (phone higher, freestyle) reads worse
   (0.26 median, 4 of 16 scorable) than session 1 (0.29, 12–13 of 25). This is the model's limit on half-submerged
   bodies, and the filming guide is the real fix.

6. **Float test.** One real treading clip (IMG_0376) spends a third of its readable frames between 35° and 55°, which
   the old test treated as "not holding". The test now counts any readable posture as "at the surface" and uses the
   angle only to say whether they floated or trod. (`safety.js`, `live.js`.)

## Thresholds, from the literature (details and citations in LITERATURE.md)
- Body line: "great" 15°, "ok" 30° kept, now documented as image-plane bands about 10° above measured true trunk
  incline (10–15° adults, 2–14° novices), because a deck-height phone adds elevation. Error bar ±5° shown in the app.
- Rhythm: per-arm ceilings for freestyle and backstroke raised from 1.3 / 1.2 Hz to 1.5 Hz, because 11–13-year-olds
  swim at 35–43 cycles a minute (1.2–1.4 Hz per arm) and were being flagged as "spinning".
- Head position and the float/tread angle bands: kept, labelled as unvalidated proxies in the code and the app.

## Model comparison (same pipeline: follow, threshold 0.4, smoothing 3, upright rule)

| Model, input | Python CPU per frame | swimming: median readable | swimming clips scored | treading: median readable | angle jitter |
|---|---|---|---|---|---|
| YOLO11n-pose, 640 px (shipped) | 49 ms | 0.28 | 13 of 41 | 0.67 | 3.9° |
| YOLO11n-pose, 960 px | 95 ms | 0.24 | 12 of 41 | 0.39 | 4.5° |
| YOLO11s-pose, 640 px | 94 ms | 0.29 | 13 of 41 | 0.81 | 3.7° |

- **960 px is out:** worse on average, half the speed. Letterboxing a 540p or 1080p phone clip to 640 already keeps the swimmer at a usable size; more pixels did not help the half-submerged torso.
- **The small model earns an optional role.** On average it reads only a point more, but on 16 of 41 swimming clips it reads more than 5 points better (IMG_0373 0.51 → 0.93, IMG_0381 0.21 → 0.56, IMG_0375 0.04 → 0.28) and it reads treading much better (0.81 vs 0.67). It costs twice the time, about a second a frame in the browser on this laptop. Decision: keep nano as the default for speed and the live coach; offer the small model as a "read harder" retry when a lap is refused for readability, and as a setting. The scored angles agree between models within a few degrees.
- **Full-resolution originals do not read better than 540p copies** (31 clips, same model): readable fractions move both ways by a few points, gates agree on 25 of 31, and the model input is 640 px either way. Parents do not need to export smaller files; the app does not need to upscale.

## Eleven clips the pipeline was never tuned on, beginner to adult (shipped browser JavaScript, `app/test/run_clips_yolo.js`, `test/frames_study/`)

| Clip | What it shows | Readable | Verdict | Fair? |
|---|---|---|---|---|
| web06 | child on a back float, filmed from the side | 62% | **80**, body 4°, "flat, nice" | yes |
| web03 | adult freestyle, close, side-on | 67% | **91**, body 15°, "a little low" | yes |
| pexels 15561931 | adult lap swimmer, elevated stock shot | 56% | **79**, body 21°, "a little low" | plausible; the elevated camera adds angle |
| web07 | adult freestyle with heavy splash | 63% | **68**, body 34°, "hips sinking" | plausible; camera above the water |
| web02 | race pool filmed from overhead | 83% | refused: body reads upright | right call, wording fixed to name the viewpoint |
| web05 | lane filmed head-on from the end | 100% | refused: body reads upright | right call, same |
| web08, 09, 10, 11 | child freestyle, side but from above | 10 to 23% | refused: not readable | honest; this is the known freestyle limit |
| web13 | adult in a small pool, far away | 3% | refused: not readable | honest |

Four scored with verdicts a coach would accept, seven refused for the right reasons, zero wrong scores. The two viewpoint refusals led to a wording change: the refusal now says a flat swimmer filmed from the end of the pool or from above looks vertical, film from the side.
