# SafeDive Coach: wireframes (as built, phone width)

Boxes are 390 px wide (iPhone 15). Bottom tab bar is 64 px on every screen. Fonts: condensed display face for numbers and headings, system sans for text. Minimum tap target 44 px. All colours meet 4.5:1 on their background in light and dark mode.

## Consent sheet (first run)
```
┌──────────────────────────────────────┐
│ ░░░ dimmed home behind ░░░           │
│┌────────────────────────────────────┐│
││ BEFORE YOU START                   ││
││ Two things to know                 ││
││ Video never leaves this device...  ││
││ Film your own swimmer...           ││
││ (not a safety device)              ││
││ [ ] I understand and I'm allowed   ││
││ [        Continue (disabled)      ]││
│└────────────────────────────────────┘│
└──────────────────────────────────────┘
```
Accessibility: checkbox is a real `<input>`, button enables on change, sheet is the first focusable content.

## Home
```
┌──────────────────────────────────────┐
│ ● SafeDive Coach           (Tadpole) │ header, level pill opens Progress
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │  photo: backstroke lap           │ │ 16:10, skeleton drawn by the model
│ │  Film one lap.                   │ │ once the page is idle
│ │  Fix one thing.                  │ │
│ └──────────────────────────────────┘ │
│ ━━━━ lane rope ━━━━━━━━━━━━━━━━━━━━━ │
│ ┌────────┬───────────┬────────────┐  │
│ │   1    │     0     │     95     │  │ laps / streak / best
│ └────────┴───────────┴────────────┘  │
│ Swimmer's name      Stroke           │
│ [e.g. Maya       ] [Backstroke  v]   │
│ [     Record or choose a video     ] │ primary
│ [     See what the app sees        ] │ ghost
│ fine print: filming tip, not a safety│
│ device                               │
├──────────────────────────────────────┤
│  Score    Learn    Progress   About  │
└──────────────────────────────────────┘
```
Alternative A: photo-less, form first. Pro: faster to the button. Con: no sense of what the app does; we chose the photo because the skeleton on it is the pitch.
Alternative B: camera opens immediately on launch. Pro: one tap fewer. Con: no consent, no name/stroke, parents may not want the camera up at a pool.

## Reading (analysis)
```
│ Reading the swimmer                  │
│ ┌──────────────────────────────────┐ │
│ │ video frame + skeleton overlay   │ │
│ └──────────────────────────────────┘ │
│ ▮▮▮▯▮▮▯▯▮▮▮▮▮▯▯▮  readability strip │ green readable, grey not, blank to go
│ ┌──────┬──────────┬──────────┐       │
│ │ 14°  │   62%    │   18 s   │       │ body now / readable so far / left
│ └──────┴──────────┴──────────┘       │
│ ▰▰▰▰▰▰▱▱▱▱ progress                  │
│ Reading the swimmer, 8 frames a sec  │
│ [            Cancel               ]  │
```

## Results
```
│ MAYA · BACKSTROKE · 10/14/2026       │ eyebrow
│ ┌──────────────────────────────────┐ │
│ │  89   STRONG LAP                 │ │ 84 px number, colour by band
│ │       readable 87% · 4.1 s scored│ │
│ └──────────────────────────────────┘ │
│ ┌ Body line ──────────────── 45/50 ┐ │
│ │ 16 degrees from flat  ▰▰▰▰▰▰▰▰▱  │ │ meter per part
│ └──────────────────────────────────┘ │
│ ┌ Head position ─────────── 30/30 ┐ │
│ ┌ Stroke rhythm ─────────── 14/20 ┐ │
│ STEP THROUGH THE LAP                 │
│ ┌──────────────────────────────────┐ │
│ │ frame + skeleton + target line   │ │
│ └──────────────────────────────────┘ │
│ ●━━━━━━━━━━━━━━━━  [ ] target line   │ range input
│ Frame 13 of 48 · body 16° · scored   │
│ ┌ chart: angle vs time, cursor ────┐ │ tap to jump
│ WHAT TO FIX                          │
│ ┃ Body line is a little low...  [Drill: Kick on your back] │
│ ┃ Head position looks right.        │ green edge = fine
│ [Save report card] [Copy as JSON]    │
│ [        Score another lap        ]  │
```
Alternative A: one card with everything folded under "details". Pro: shorter page. Con: hides the evidence that earns trust; we show it.
Alternative B: video playback with overlay instead of a scrubber. Pro: feels live. Con: playback at 30 fps with no skeleton on 29 of 30 frames looks broken; the scrubber shows exactly the frames the score used.

## Drill
```
│ DRILL                                │
│ Press the T                          │
│ why, one sentence                    │
│ 1. ... 2. ... 3. ... 4. ...          │
│ ┃ How much: 6 glides of 5 seconds    │
│ [       Back to results           ]  │
```

## Progress
```
│ Progress                             │
│ ┌ ◔ ring  LEVEL                      │
│ │         Tadpole                    │
│ │         2 more laps to Minnow      │
│ (Everyone) (Maya) (Dev)   chips if >1│
│ ┌ bars, last 12, colour by band ───┐ │ tap a bar
│ ┃ Fri, Oct 9 · Maya · Backstroke     │ detail card
│ ┃ Score 95. Body 18°, readable 80%.  │
│ 10/9/2026 · Maya Backstroke     95   │ list rows, tappable
```

## Why trust the number (About)
```
│ Why trust the number                 │
│ paragraph: the 31-clip question      │
│ ┌ dot plot: angle by clip type ────┐ │ tap a dot
│ ┃ Clip 0389, swimming, 4.5 s ...     │
│ table: the app's pipeline on 6 clips │
│ honest limits (3 bullets)            │
│ [     Privacy and settings        ]  │
```

## Settings
```
│ Privacy and settings                 │
│ ┃ Where your video goes: nowhere.    │
│ Consent paragraph                    │
│ Your data: N laps stored since ...   │
│ [ Delete all scored laps (red) ]     │
│ Credits, version                     │
```

Accessibility notes: every canvas has an `aria-label`; charts are supplemented by text (the readout line, the detail card); the range input is keyboard-operable; dark mode follows the system and keeps the same contrast; nothing depends on colour alone (score band also has a word, tips have a left edge *and* a drill button).
