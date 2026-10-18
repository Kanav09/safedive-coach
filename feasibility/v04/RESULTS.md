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

## Parity: the shipped JavaScript versus the Python study (`app/test/run_clips_yolo.js`, six sample clips, 10 fps)

The Node harness used to shrink frames with nearest-neighbour sampling; the browser uses bilinear `drawImage`. Nearest-neighbour
aliased fine detail and under-read both models (the careful model badly: IMG_0389 29% readable instead of 40%). The harness now
interpolates like the browser. With that fixed, the harness, Python and Chrome agree:

| Clip | fast model readable | careful model readable | verdict (fast / careful) |
|---|---|---|---|
| backstroke lap IMG_0389 | 33% | 40% | **90** / **85** (body 14° / 18°, inside the ±5° bar) |
| back float IMG_0384 | 30% | 23% | refused (readability) / refused |
| back float IMG_0388 | 16% | 18% | refused / refused |
| freestyle from deck IMG_0380 | 30% | 36% | refused (readability) / refused (upright: standing most of the time) |
| treading IMG_0392 | 99% | 100% | refused (upright, not a lap) / same |
| acted distress IMG_0377 | 74% | 79% | refused (upright) / same |

Speed in Node, single wasm thread: fast 0.36 s a frame, careful 1.0 to 1.4 s. In Chrome with four threads both are roughly three
times faster. No wrong score from either model on these six.

## Clips fetched from Wikimedia Commons (`feasibility/v04/commons/SOURCES.md`)

Five of the six British Swimming files are poolside interviews with the winners, not races (the titles do not say so).
One was kept as a negative test: a person out of water must never be scored as a lap. The sixth, "Mary's Swim Boot Camp:
Kari freestyle" (adult, 1080p, 14 s), is filmed from the end of the lane with the swimmer coming toward the camera.
Frame by frame with the fast model: while she swims away (5.5 to 8.5 s) no person is detected at all; as she approaches
(11.5 to 14 s) the near shoulder reads at 0.7 to 0.8 but the far shoulder and both hips sit at 0.02 to 0.3, under the
0.4 gate, so those frames are unreadable; the only readable frames are a person standing on the deck (0.5 to 5 s,
hips at 0.9+, angle 75 to 90°). Result: refused, "the body read as upright … or filmed from the end of the pool", which
is the right verdict and the wording added for exactly this case. Lesson confirmed: a head-on view gives the model no
hips to read, and the swimmer-following falls back to whoever is visible, so the upright rule is what saves the parent
from a wrong score.

Results on those two (shipped JavaScript, both models): the interview clip reads 0% readable with either model (shoulders in
frame, hips never, so no frame passes the torso gate) and is refused; the head-on freestyle reads 48% (fast) / 56% (careful)
but is refused as upright by both, as explained above. Neither model produced a score on footage that is not a lap.

## The ladder, final rules (fast model, shipped JavaScript, 24 clips the pipeline was never tuned on)

Final rule set: follow one swimmer, median-smooth 3 samples, keypoint gate 0.4, upright frames (>60°) never scored, a scored
median steeper than 45° refused as a camera problem, readability gate 30%, one second of real swimming.

| Level | Clip | Readable | Verdict |
|---|---|---|---|
| beginner | child on a back float, side view (web06) | 54% | **100**, body 6°, flat |
| beginner | child freestyle from above, four clips (web08 to 11) | 11 to 23% | refused: not readable (the known freestyle limit) |
| beginner | your own six sample clips | see parity table | one lap 90, the rest refused for the right reasons |
| adult | freestyle, close, side-on (web03) | 65% | **89**, body 17°, "a little low" |
| adult | freestyle with heavy splash (web07) | 63% | **62**, body 36°, "hips look low" plus the camera caveat |
| adult | lap swimmer, elevated stock shot (Pexels 15561931) | 55% | **76**, body 23° |
| adult | kickboard drill, filmed from high behind (Pexels 8050294) | 67% | refused: 56°, camera too high or behind (was scored 50 "hips sinking" before the steep rule) |
| adult | butterfly, portrait (Pexels 8686014) | 18% | refused: not readable; not a stroke the app claims |
| adult | backstroke head-on (Pexels 4115398) | 100% | refused: body reads upright, film from the side |
| adult | freestyle from the end of the lane (Commons, Kari) | 48% | refused: upright / end of lane |
| adult | small pool, far away (web13) | 4% | refused: not readable |
| not a lap | swimmer resting at the wall (Pexels 6012160) | 70% | refused: upright |
| not a lap | woman at the wall, portrait (Pexels 8050293) | 67% | refused: 47°, steep (was scored 61 and 100 by the two models before the steep rule) |
| not a lap | poolside interview (Commons, Adam Brown) | 0% | refused: not readable |
| not a lap | race pool from overhead (web02), lane head-on (web05) | 80 to 100% | refused: upright, film from the side |
| elite | Universiade 400 m final, wide shot from the stands | 34% | refused: upright most of the time (swimmers tiny; blocks and podium frames) |
| elite | Universiade 4×200 m final, wide shot from the stands | 47% | **63**, body 44°, "hips look low" plus the camera caveat |

Five scored, nineteen refused, and after the steep rule no clip that is not a lap received a score. The one verdict a coach
would dispute is the 4×200 relay: elite swimmers told their hips look low. The camera is in the stands, 30° or more above the
water, which the app does not claim to support and the tip now says so; a side view at water level is the filming guide's
first rule for exactly this reason. Everything above is reproducible with `FRAMES=frames_study|frames_commons|frames_commons2
node test/run_clips_yolo.js` once the frames are dumped (`feasibility/v04/commons/SOURCES.md` lists the inputs).

## Third batch: nineteen more clips (fast model / careful model, shipped JavaScript, `test/frames_b3`)

| Level and view | Clip | Readable | Verdict |
|---|---|---|---|
| beginner, backyard, close | kid splashing at the surface (Pexels 6588987) | 28% / 30% | refused / **90** flat 14° |
| beginner, lesson on floats, elevated side | kids with an instructor (Pexels 38731893) | 98% / 93% | **64** "hips look low" 44° / refused steep 45° |
| trained, **side-on, close, phone a little above the water** | para swimmer freestyle (Pexels 4115985) | **90% / 93%** | **71** / **66**, body 33° / 32°, "hips look low" |
| trained, side, slightly elevated, close | woman backstroke (Pexels 8050234) | 87% / 82% | **94** / **96**, body 6° / 15° |
| trained, side-on **at the water surface** | male laps (6539603), swimmer strokes (6539613), skilled swimmer (6539542), man freestyle far (6012158), breaststroke (6539521) | 12 to 26% | all refused: not readable |
| trained, far, small in frame | athlete in lane (6539552), athlete laps dark pool (6012510), Olympic pool from the stands (14090821) | 5 to 16% | refused: not readable |
| trained, head-on | amputee swimmer backstroke toward camera (4115399) | 98% | refused: upright, film from the side |
| trained, underwater | backstroke athlete (6539511), woman breaststroke (6539513) | 20 to 61% | fast scored the backstroke 76 at 21°; careful refused both (readability / steep) |
| not a lap | woman at the wall (6539692) | 3% / 0% | refused |
| competitive, portrait, wide | outdoor race (34394019) | 48% / 63% | **92** / **94**, flat 11°, on the near swimmer |
| historical newsreels | 1948 nationals, 1971 youth championships | 28 to 45% | refused: upright most of the time (crowd, podium, starts) |

What this batch taught:

1. **Freestyle filmed at the water surface is unreadable, even side-on and close.** Five such clips read 12 to 26%. The hips
   of a front-crawl swimmer sit at or under the surface, and from water level the model cannot see them. The one freestyle
   clip that read 90% (the para swimmer) was filmed close and a little above the water, looking slightly down through the
   surface. The filming guide used to say "get low, near water level"; it now says crouch on the deck, a little above the
   water, close, side-on. Standing height inflates the angle; the surface hides the hips; in between is the sweet spot.
2. **Backstroke reads beautifully** from the side at any sensible height (87%, scored 94 and 96, body 6 to 15°). The app's
   own kid backstroke lap agrees (33%, 90). Backstroke and back float are the app's strongest case and the guide says so.
3. **The one verdict to question** is the para swimmer: a strong freestyler told "hips look low" at 33°. Both models agree
   on the angle, so it is not noise; it is the image-plane angle of a rolling freestyle body seen from slightly above. The
   absolute body-line number depends on where the phone was, so the app now tells parents to compare laps filmed from the
   same spot and watch the trend, rather than treat one number as a verdict. The bands were not changed on one clip.
4. **The rules held.** Nothing that was not a lap received a score from the careful model; the fast model gave a 64 to kids
   hanging on floats at 44°, one degree under the steep line, and a 76 to an underwater backstroke, a view the app does not
   claim. Head-on, far, and dry-land clips all refused for the stated reasons.

Running totals across every clip the pipeline was never tuned on: 43 clips, 11 scored, 32 refused, two scores a coach would
argue with (the relay from the stands and the para swimmer, both camera-position effects), none on a person out of the water.
