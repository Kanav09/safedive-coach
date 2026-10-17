# What the literature says about SafeDive Coach's thresholds (2026-10-17)

Compiled from a web survey run for v0.4. Every number below was read on the cited page unless marked *snippet*
(seen only in a search excerpt; verify before quoting in print). This file is the evidence behind the threshold
changes in `app/js/scoring.js` and the honest-limits text in the app.

## 1. Trunk / body inclination (shoulder–hip line vs horizontal, side view)

**Skilled adults**
- Zamparo, Gatta, Pendergast, Capelli (2009). *Active and passive drag: the role of trunk incline.* Eur J Appl Physiol 106:195–205. https://www.aplab.it/en/assets/u/papers/zamparo_trunk.pdf
  Trunk incline (acromion to great trochanter, 50 Hz video through an underwater window). Front crawl, 6 males ~20 y:
  15±3° at 1.0 m/s, 14±3° at 1.1, 13±3° at 1.2, 11±2° at 1.3, 10±2° at 1.4 m/s. Kick-only: 21±3° at 0.6 m/s down to 16±5° at 1.0 m/s.
  Second group (25 swimmers ~23 y): passive towing about 3.9° (men) / 5.4° (women); free swimming 1.0–1.6 m/s about 10.5° / 11.5°.
- Gonjo, Fernandes, Vilas-Boas, Sanders (2023). *Differences in the rotational effect of buoyancy and trunk kinematics between front crawl and backstroke swimming.* Sports Biomechanics 22(12):1590–1601. https://eprints.bournemouth.ac.uk/36259/
  10 competitive swimmers 17.5±1.0 y, 3D underwater video. Trunk angle to horizontal: front crawl 11.3–11.8°, backstroke 9.6–10.5° across four speeds. No effect of technique.
- Pease & Vennell (2010). *The effect of angle of attack and depth on passive drag.* BMS XI, 145–147. "body angles of approximately 15 degrees were found" (citing Zamparo 2006, 2008).

**Children / beginners**
- Jerszyński et al. (2013). *Changes in selected parameters of swimming technique in the back crawl and the front crawl in young novice swimmers.* J Human Kinetics 37:161–171. https://pmc.ncbi.nlm.nih.gov/articles/PMC3796834/
  11 novices aged 8–13, seven tests over 18 months. Angle between waterline and shoulder–hip line, front crawl: 4.7° (arm entry) and 6.8° (recovery) at test 1, falling to 4.1° and 4.8° at test 7; back crawl 4.7°/7.6° → 3.7°/5.0°. Range across children at test 1: 2.2–11.6° (front), 3.3–14.3° (back). The angle fell as technique improved (p < 0.005). These values are lower than the adult studies (different instant in the cycle, 2D method), so treat the absolute numbers with care.
- Zamparo et al. (2008). *The interplay between propelling efficiency, hydrodynamic position and energy cost of front crawl in 8 to 19-year-old swimmers.* Eur J Appl Physiol 104:689–699. Reports hydrodynamic position as torque and frontal-area ratios, no angle in degrees.

**"Hips sinking"**: no paper defines a degree threshold. The highest documented swimming values are the kick-only 16–21° (Zamparo 2009) and 15±3° at the slowest adult crawl speed.

## 2. Head position
- Swim England (2019), *Improving your front crawl technique*. https://www.swimming.org/masters/improving-front-crawl-technique/ Water "between your eyebrows and hairline", eyes forward and down; "the more your head raises, the more your feet and legs will sink".
- Swim England (2019), *Improving your backstroke technique*. https://www.swimming.org/masters/improving-your-backstroke-technique/ "The water level should cover your ears and your eyes should look up and back." "Don't let your hips drop too low."
- US Masters Swimming, Kahn (2012), *Master Backstroke*. https://www.usms.org/fitness-and-training/articles-and-videos/articles/master-backstroke Water "just under the ears, chin held in a neutral position, and eyes looking upwards".
- US Masters Swimming, Bay (2022), *How to find your proper head position in freestyle and backstroke*. https://www.usms.org/fitness-and-training/articles-and-videos/articles/how-to-find-your-proper-head-position-in-freestyle-and-backstroke "waterline should be right at the top of your goggles"; "the higher your head is, the more your hips sink".
- No source quantifies a gaze angle, and nothing in the literature uses a (shoulder y − nose y) / torso-length ratio. The app's head-lift ranges are an unvalidated proxy for the cues above and are labelled as such.

## 3. Stroke rate (units stated; a cycle is both arms, the app counts each arm)
- Kjendlie, Stallman, Stray-Gundersen (2004). *Adults have lower stroke rate during submaximal front crawl swimming than children.* Eur J Appl Physiol 91:649–655. Children 11.7±0.8 y at 1.0 m/s: 0.58 (0.06) cycles/s (= 35 cycles/min = about 70 single-arm strokes/min, 1.16 Hz per arm); adults 0.38 (0.04) cycles/s.
- Poujade, Hautier, Rouard (2002). *Determinants of the energy cost of front-crawl swimming in children.* Eur J Appl Physiol 87:1–6. 11 children 12.4 y: 31.3, 34.1, 38.3 cycles/min at 0.9, 1.0, 1.1 m/s (1.0–1.3 Hz per arm).
- Jerszyński 2013 (above): novice 8–13 y stroke-cycle duration about 1.9 s front crawl, 1.7–2.1 s back crawl (about 0.5 Hz cycles, 1.0 Hz per arm).
- Greco et al. (2007). *Effects of gender on stroke rates…* J Sports Sci Med 6:441–447. ~15 y front crawl: 32.6–33.6 cycles/min over 30 min, 40–41 cycles/min at 200 m max.
- Silva et al. (2013). *Backstroke technical characterization of 11–13 year-old swimmers.* J Sports Sci Med 12:623–629. *Snippet:* 50 m pace 38.4–43.4 cycles/min (0.64–0.72 Hz cycles, 1.3–1.4 Hz per arm).
- Breaststroke, adults (Sports Med Open 2022 review, doi 10.1186/s40798-022-00467-2, *snippet*): 32–43 cycles/min at 60–100% speed (0.54–0.89 Hz). No child data found.
- Flutter kick: Ng, Yam, Lum, Barbosa (2019). J Adv Res 21:65–70. https://pmc.ncbi.nlm.nih.gov/articles/PMC6811994/ Adult all-out 25 m kick 2.40±0.24 Hz. No child kick-rate found.

## 4. Water competency
- American Red Cross, *Water Safety Skills* (2020). https://www.redcross.org/content/dam/redcross/get-help/water-safety/Water_Safety_Skills_Infographic.pdf (1) step or jump into water over your head; (2) return to the surface and float or tread water for one minute; (3) turn around in a full circle and find an exit; (4) swim 25 yards to the exit; (5) exit the water, in a pool without using the ladder. (Wording confirmed through search excerpts and press coverage; the PDF refused a direct fetch.)
- Swim England self-rescue outcomes (KS2). https://schools.swimming.org/school-swimming-clarification/ "Float on the back with minimal movement for 60 seconds"; "Tread water for 30 seconds"; swim 15 m to exit unaided; curriculum 25 m.
- Royal Life Saving Australia benchmarks (via Y NSW summary). https://www.ymcansw.org.au/news-and-media/news/how-well-should-your-child-be-able-to-swim/ Age 6: float and recover, move continuously 5 m. Age 12: float, scull or tread for 2 minutes and signal for help; swim 50 m.
- YMCA Safety Around Water (*excerpt*): swim-float-swim 25 yd; jump, push, turn, grab; tread water 1 min (30 s preschool).

## 5. Pose estimation on swimmers
- Einfalt, Zecha, Lienhart (2018). WACV. https://arxiv.org/abs/1802.00634 Side-on camera behind glass; occlusion by the water line (head, lower legs) and self-occlusion; PCK@0.2 freestyle 79.0%, backstroke 86.7%, breaststroke 96.6%, butterfly 97.7%; freestyle right wrist 48.5%.
- Coifman, Hakim, Weiss, Riemer (2026). *Human pose estimation for automated biomechanical swimming analysis.* Sports Biomechanics. Sagittal-view AP 91.5%; stroke-rate and kick-rate error under 1% vs manual on 24 videos.
- Giulietti et al. (2023). *SwimmerNET.* Sensors. Underwater GoPro, 63° field of view at 6 m gives ~9 m of lane; left/right swaps and self-occlusion are the main failures.
- Nothing published on shoulder/hip detectability from an above-water phone, nor on phone camera height. Our own 87-clip study (this folder) is the only evidence we have for that, and the filming guide comes from it.

## 6. Angle error from monocular 2D keypoints (dry land only)
- Cheng et al. (2025). *Reliability and validity of computer-vision motion capture in gait analysis.* Gait & Posture 120:150–160. OpenPose 2D sagittal hip and knee angle MAE under 5.2°.
- Rode et al. (2025). Sci Rep 15:38767. https://pmc.ncbi.nlm.nih.gov/articles/PMC12589393/ 11 monocular estimators vs Vicon: 2D joint error 72–122 mm; knee-flexion MAE from 9.3°.
- Zhang et al. (2026). Applied Ergonomics 138:104866. MediaPipe/OpenCap vs Vicon, sagittal RMSE 9.9–31.2° in lifting.
- Honest statement: about ±5° on a 2D segment angle in good conditions, worse with splash; no in-water validation exists. The reference methods themselves have ±2–3° between-subject spread.

## What changed in the app because of this
See `scoring.js` THRESHOLDS and the commit that added this file. In short: "ok" body line 30° → 22°; backstroke uses the same band as front crawl; per-arm rhythm ceilings for freestyle and backstroke raised to 1.5 Hz; head-lift ranges kept but labelled as an unvalidated proxy; float/tread angle bands kept and labelled; a ±5° error note added to the results and About screens.

## Claims that still have no literature support (said so in the app)
- The 60° zero-score point for body line and the exact "ok" edge.
- Trunk angle ≤35° = floating, ≥55° = treading.
- Every head-lift ratio range.
- The 0.3 Hz floors for breaststroke and kick.
- How often shoulders and hips are visible from an above-water phone; the only evidence is our own study.
