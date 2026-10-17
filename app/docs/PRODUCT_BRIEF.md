# SafeDive Coach: product brief (discovery)

*Platform: installable web app (works on iPhone and Android through the browser, no store needed). Inputs: a clip recorded in the app or chosen from the camera roll. Primary user: a parent on the pool deck with a beginner swimmer. Stage: working prototype, October 2026. Inference: on the phone, nothing uploaded.*

This brief adapts a generic "swim video analysis" discovery template to what SafeDive Coach actually is. Where the template assumed a native iOS app with cloud inference and a 12-week team, we chose the opposite on purpose: a one-page web app whose model runs locally, built by a team of high-school students in three weeks. Those choices are explained under Assumptions.

## Personas

| | Goal | Pain today | Skill |
|---|---|---|---|
| **Priya, parent, 41.** Takes her 7-year-old to Saturday lessons. | Know whether the kid is improving between lessons and have one thing to practise. | The instructor has 6 kids and 30 minutes. Feedback is "good job". She films laps on her phone but cannot read them. | Non-swimmer, not technical. |
| **Dev, 11, beginner swimmer.** | Get to the next level badge; stop sinking at the end of a length. | Told "kick harder" without knowing what that looks like. Loses interest when there is no score. | Can swim 25 m freestyle and backstroke, tires fast. |
| **Ms. Okafor, YMCA swim instructor.** | Send parents home with a drill that matches what she saw in class. | No time to write notes per child; parents forget verbal tips by the car park. | Expert swimmer; moderate with apps. |

## Top features, prioritised

1. **Score one lap on the phone (must).** The whole product. Pose model finds the swimmer, the app turns shoulders-to-hips into a body-line angle, head lift and stroke rhythm, and gives a 0 to 100 score.
2. **Refuse to guess (must).** If the torso is readable in under 30% of frames or there is under one second of actual travelling, the app says so and explains how to film better. Trust depends on this more than on any feature.
3. **One tip, one drill (must).** Every scored lap ends in one plain-English thing to fix and a named drill with steps and reps. Not five tips; one.
4. **Step through the lap (should).** A scrubber over the analysed frames with the skeleton, the target line and the angle chart, so a parent can see *why* the score is what it is.
5. **Progress and levels (should).** Scores over time per swimmer, Tadpole to Shark levels by laps scored, a weekly streak. Enough game to bring an 11-year-old back; not so much that it hides the swimming.
6. **How to film, with our own footage (should).** Five rules and two real frames, good and hard, because filming is the biggest source of bad results.

Deliberately out: live camera analysis (battery, and a parent should be watching the water, not a phone), stroke classification (we ask the parent, who knows), cloud accounts (nothing to leak), multi-swimmer tracking.

## MVP scope (as built)

Screens: Home (score a lap), What the app sees, How to film, Reading (analysis), Results, Drill, Progress, Why trust the number, Privacy and settings, first-run consent sheet.

Flows: (1) film or choose a clip, score, read the tip, open the drill; (2) look at progress, tap a past lap, reopen its drill; (3) learn what the model sees by running it on real frames.

## Success metrics

| Metric | Target | How measured |
|---|---|---|
| Score agreement with a swim instructor on the body-line fault (sinking hips vs flat) | 8 of 10 clips agree | Instructor labels 10 parent-filmed clips blind; compare with the app's body-line part. |
| Refusal rate on clips filmed by following the guide | under 25% refused | Count refusals on the usability-test clips filmed with the in-app guide. |
| Parent can name the one thing to practise, unprompted, 10 minutes later | 4 of 5 test parents | Usability test, question 3. |

## Assumptions

- Parents already film laps on their phones; the app's job is to read the film, not to change behaviour.
- Freestyle filmed from standing height is mostly unreadable with the phone-sized model (measured: 7 to 18% of frames). Backstroke, back float, kick on a board and anything vertical read well. The guide steers filming accordingly rather than promising all strokes.
- On-device inference is fast enough: about 0.4 s a frame on a 2024 laptop, 4 to 8 analysed frames per second, a 15 s clip in under a minute on a recent phone. We trade accuracy (the bigger model reads 60% of swimming frames) for zero upload and zero cost.
- Thresholds were tuned on one pool, one swimmer, 31 clips. They separate flat from vertical reliably; finer coaching (head lift, rhythm) is a starting point that needs more swimmers.
- Judging rubric values "excellence of coding" at about a third: no build step, no framework, every file explainable in a walkthrough.
