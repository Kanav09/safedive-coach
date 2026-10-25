# Submission draft: 2026 Congressional App Challenge

A draft for Kanav to rewrite in his own words before the form is filled in. Everything below is true of the
repository as of 2026-10-19 (v0.5). Check the live form for the exact questions and word limits; the ones here
are the usual ones. Do not submit anything you cannot say out loud in a code walkthrough.

## What has to exist before you submit

- [ ] Demo video, 3 minutes or under, uploaded (YouTube unlisted or Vimeo). Storyboard below.
- [ ] Tested on a real phone at a pool: one real lap scored, the live coach with the camera allowed, the float test.
- [ ] Public repository link: github.com/Kanav09/safedive-coach (it is public; check it still opens logged out).
- [ ] Written answers, in your voice, under the word limits.
- [ ] Any AI-use disclosure the form asks for, answered honestly (draft below).
- [ ] Team members and the district's representative confirmed on the form.

## The 3-minute video, shot by shot

Film it on a phone, in portrait, with screen recording for the app parts and one person talking. No music
under the talking. Every claim in it must be something the app actually does on screen.

| Time | On screen | Say |
|---|---|---|
| 0:00 | You at a pool, phone in hand | "Swim lessons end with 'good job'. Parents film laps they can't read. SafeDive Coach reads them, on the phone, and says the one thing to fix." |
| 0:15 | Screen: home, tap "See it work on our sample lap" | "Everything runs on the phone. A pose model finds the swimmer's shoulders and hips in every frame. Nothing is uploaded, ever." |
| 0:35 | Screen: reading the swimmer (strip filling, body angle readout) | "It follows one swimmer, smooths the points, and only counts frames where they are actually swimming." |
| 0:50 | Screen: 90, Strong lap, the three parts, step through the lap, the angle chart (the newer script with the cooler open and phone passes is in the shared doc "SafeDive Coach demo video script") | "A score out of 100: body line, head position, stroke rhythm. Every number comes with the frames it used and a ±5° error bar." |
| 1:10 | Screen: a refused clip (freestyle from the deck), "What to try" | "When the footage is bad it refuses and tells you how to film instead of guessing. That took an 87-clip study to get right." |
| 1:30 | Real pool: you filming a lap from a crouch on the side; then the result | "A real lap, filmed from the side, a little above the water." |
| 1:55 | Screen: Live coach, dial moving, cue spoken | "Live mode: the same model a few times a second, with one cue you can call out." |
| 2:15 | Screen: Safety tab, sign off a skill, water-safe card | "The five Red Cross water-competency skills, per child. The camera times the one-minute float." |
| 2:35 | Screen: Progress, badges, compare two laps; Learn, the study chart | "Progress, badges, and the evidence: our own 31-clip study is in the app, and the rules are checked against published swimming biomechanics." |
| 2:50 | You | "Plain HTML and JavaScript, no framework, so every file can be explained. SafeDive Coach." |

## Draft answers

**What does your app do?** (short description)
SafeDive Coach scores one lap of a child's swimming from a short phone clip. A pose model running in the
browser finds the shoulders and hips in each frame, the app measures the body line against the water, and
it gives a 0 to 100 score, one plain tip and one drill. It also has a live mode, a water-safety skills
checklist based on the American Red Cross water-competency skills, progress and badges. Nothing is uploaded:
the video never leaves the phone. It runs in the phone's browser from https://kanav09.github.io/safedive-coach/
and installs to the home screen, so anyone can try it without an app store.

**What inspired you to create this app?**
It grew out of our drowning-detection research project, which used the same idea: find a person's skeleton
in video and reason about the geometry. While filming test footage at our pool we noticed parents filming
their kids' lessons on their phones and getting nothing from it, and lessons ending with "good job". The
same skeleton idea, pointed at swim lessons instead of emergencies, gives a parent one concrete thing to
practise. We also wanted it to be honest: it refuses to score bad footage rather than guessing.

**What technical difficulties did you face, and how did you overcome them?**
Three big ones. First, pose models are trained on people on land; a swimmer face down in splash is often
unreadable. We filmed 31 clips ourselves and ran a study to see what the model can actually read, then set
a readability gate (30% of frames, one second of real swimming) and made the app refuse below it. Second,
the first version gave scores to clips that were not laps at all: a kid treading water scored 47. We added a
rule that frames steeper than 60° (standing, treading, at the wall) are never scored, and a second rule that a
lap reading steeper than 45° the whole way is a camera-position problem, not sinking hips. We checked both on
43 more clips the rules were never tuned on. Third, running a 12 MB model in a phone browser with no server:
we export YOLO11-pose to ONNX, run it with onnxruntime-web, and wrote the letterboxing, decoding and
non-maximum suppression ourselves in plain JavaScript so there is no build step and every file can be
explained. A fourth one we found late: a slow phone reads 4 frames a second and a fast one 8, and two of our
rules counted frames instead of seconds, so the same lap scored 100 on one phone and 90 on the other. We
rewrote the moving-swimmer window and the stroke-rhythm estimate to work in seconds on the real time axis,
and the rhythm is now reported only when a steady beat is visible for two and a half cycles; otherwise the
app says so and gives half marks. The same clip now scores the same at both rates, and the tests check it.

**What improvements would you make?**
Freestyle filmed from the pool surface is still mostly unreadable; a model fine-tuned on swimmers would fix
the biggest limit. The head-position and rhythm bands are our own and are not validated against a study yet.
We would run the usability plan with real parents at our pool, add stroke detection so the parent does not
pick it, and test the live coach on more phones.

**Programming languages and tools.**
JavaScript, HTML and CSS, no framework and no build step. Python (Ultralytics, OpenCV) for the offline
study and the model export only. Pose model: Ultralytics YOLO11n-pose (AGPL-3.0), run in the browser with
onnxruntime-web (MIT). Git and GitHub.

**AI assistance (if the form asks).** Write this one yourself and keep it accurate. A true version: we used
Claude (Anthropic's coding assistant) heavily throughout, for design, writing code, running the clip studies
and drafting documents, with us directing the work, testing it at the pool and reviewing every file so we
can explain it. If the rules require anything beyond disclosure, follow them.

## Before you press submit

Read every sentence of the answers above and change any you would not say yourself. Judges may ask you to
walk through the code; the files to know cold are `js/metrics.js` (what is measured), `js/scoring.js` (the
rules and why), `js/pose_yolo.js` (how the model runs), and `feasibility/v04/RESULTS.md` (the evidence).
