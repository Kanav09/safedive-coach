---
name: SafeDive Coach
description: A two-ink risograph pool flyer where the overprint of aqua over orange is the measurement.
colors:
  paper: "#f6f1e4"
  paper-bright: "#fffdf7"
  paper-deep: "#e8e0cc"
  ink: "#1a1a1a"
  ink-2: "#4f4b43"
  hair: "rgba(26, 26, 26, 0.22)"
  aqua: "#00a6c8"
  aqua-text: "#00687f"
  aqua-pale: "#cfeaf1"
  sun: "#ff6a2a"
  sun-text: "#b8380a"
  over: "#004521"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "48px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "wdth 100"
  score:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "96px"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.04em"
    fontVariation: "wdth 90"
  headline:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Atkinson Hyperlegible, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "Atkinson Hyperlegible, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  none: "0px"
  sm: "3px"
  round: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  gutter: "16px"
  lg: "22px"
  tabs: "72px"
components:
  button-primary:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "56px"
  button-secondary:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "56px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.aqua-text}"
    typography: "{typography.title}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "50px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.sun-text}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "56px"
  button-disabled:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
  input-text:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "50px"
  chip:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  chip-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
  notice:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
  tab-bar:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "72px"
  tab-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.sun-text}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
  meter:
    backgroundColor: "{colors.paper-deep}"
    rounded: "{rounded.none}"
    height: "14px"
  level-stamp:
    backgroundColor: "transparent"
    textColor: "{colors.aqua-text}"
    typography: "{typography.label}"
    rounded: "{rounded.round}"
    size: "58px"
---

# Design System: SafeDive Coach

<!-- Scan-mode record of the shipped build, 2026-10-17. Ground truth: app/css/style.css, app/index.html, app/js/draw.js, app/js/report.js. The direction contract is .impeccable/surfaces/app-index-html.md (FORM: Parks & Rec pool flyer, seed:24be08711fa4351e). -->

## Overview

**Creative North Star: "The Rec Department Flyer"**

SafeDive Coach is printed, not rendered. The whole app is one two-ink risograph flyer from a town pool's recreation department: cream paper, an aqua ink, a sun-orange ink, and black for the words. It refuses the category default of white cards, one blue, soft shadows and a hero-metric block. Everything sits flat on the paper and is separated by ruled ink lines, the way a photocopied program is laid out with a ruler, and the density is high because the parent reads it once, on a sunlit deck, with wet hands.

The signature move is that the overprint is the measurement. Aqua and orange are never decoration: aqua prints the target zone, orange prints the swimmer's reading, and wherever the two inks overlap the paper turns deep overprint green. That green is the only "good" colour in the app, and it is never painted directly on a surface; it appears only where a reading has reached its target (the meters, the charts, the hero band). State is overprint, never a fourth colour.

The build keeps the world honest with standard controls. Inputs, buttons, a select, a range, a checkbox and a bottom tab bar are all ordinary web elements given 2 px ink borders and the two inks; the world shows in type, palette, density and the one overprint move, not in invented widgets. Light only: a sunlit deck has no dark mode (`color-scheme: light` is declared and nothing else is themed).

**Key Characteristics:**
- Three inks on paper: aqua, sun-orange, black; green exists only as their overprint.
- Overprint as measurement: `mix-blend-mode: multiply` in CSS and `globalCompositeOperation = 'multiply'` on every canvas.
- Ruled, not carded: 2 px and 3 px ink rules divide content; fills are flat; there are no shadows anywhere.
- One display face carries every heading and every number (Bricolage Grotesque 800); one body face carries every sentence (Atkinson Hyperlegible).
- A fixed five-step type ramp (13, 16, 22, 32, 48 px) with the score alone at the doubled top step (96 px).
- Corners of 3 px on controls and cards, square on meters and rules, a full circle only on the level stamp.
- One authored motion: the orange reading growing into the aqua band.

## Colors

Three inks and a paper, each with a darker "-text" cut of the same ink for type and a pale tint for fills; nothing is grey, secondary text is a tint of ink on paper.

### Primary
- **Sun-Orange Ink** (`sun`): the swimmer's reading. Fills the primary button, the active tab bar, the meter reading, the scored stretch of the angle chart, the torso line in the video overlay, the range thumb, and the caption band on the hero. In canvases it is drawn with multiply so it overprints whatever is under it.
- **Sun-Orange Text** (`sun-text`): the same ink dark enough to read as type. Headline numbers in the stats strip and readouts, the "Coach" in the masthead, the active tab label, the "warn" score colour (55 to 79), and the danger button's outline and text.

### Secondary
- **Aqua Ink** (`aqua`): the target zone. The meter's target band, the aqua fill behind the angle and history charts' target thresholds, the hero's ink colour, the target line and joints in the video overlay, the checked checkbox, the progress bar, the focus ring (3 px), text selection, and the level stamp's ring.
- **Aqua Text** (`aqua-text`): links, the ghost button's text and border, the level stamp's lettering, and swimming clips on the study chart.
- **Aqua Tint** (`aqua-pale`): a flat pale fill for the selected history row, the example-card result box, and the "ok" band on the study chart. The only tint of aqua that is ever a background.

### Tertiary
- **Overprint Green** (`over`): aqua printed over orange. The "good" score colour (80 and up), the border of a good notice, and the readable frames on the readability strip. Everywhere else it is produced, not painted: the meter's reading crossing into the target band, the orange band over the aqua hero, and the orange bars over the aqua threshold fills on the charts.

### Neutral
- **Paper** (`paper`): the page, the masthead, the tab bar, the consent sheet card, and the headline printed in reverse on the hero band.
- **Paper Bright** (`paper-bright`): the fill of anything that is a form: inputs, select, secondary button, cards, notices, chips, the charts' canvases, the checkbox.
- **Paper Deep** (`paper-deep`): the empty track of every meter, bar and progress bar, and the unreadable frames on the readability strip.
- **Ink** (`ink`): all words, all rules, the icon strokes, the stage behind video, the "bad" score colour (below 55), the "on" chip's fill, and the consent sheet's scrim at 62% (`rgba(26,26,26,.62)`).
- **Ink Tint** (`ink-2`): secondary copy, fine print, placeholders, uppercase field labels and table headers, chart axis labels.
- **Hairline** (`hair`): 1 px dividers between list rows and meter parts, chart grid lines, the disabled button's border.

### Named Rules
**The Overprint Rule.** Green is never a fill you choose. It is what aqua over orange prints, so it may appear on a surface only where a reading has reached its target; write "good" with `--over` for type and borders, and produce it with multiply everywhere a measurement is drawn.

**The Three-Ink Rule.** State is overprint, never a fourth colour. Good is green, warning is orange text, bad is ink. No red, no yellow, no grey.

**The Ink-Tint Rule.** Secondary text is a tint of ink on paper (`ink-2`), never a grey. Dividers that are not rules are 22% ink (`hair`).

## Typography

**Display Font:** Bricolage Grotesque (variable, self-hosted in `app/vendor/fonts`, weight axis 200 to 800, width axis 75% to 100%; falls back to Helvetica Neue, Arial)
**Body Font:** Atkinson Hyperlegible 400 and 700 (self-hosted; same fallback stack)

**Character:** A wide, heavy grotesque sets every heading and every number like a flyer headline; a hyperlegible humanist sans carries the sentences so they read in direct sunlight. The pairing is loud where it counts and plain everywhere else. Tabular numerals are on for the whole document.

### Hierarchy
- **Score** (800, 96 px, line-height 0.9, letter-spacing -0.04em, width 90%): the lap score alone. It is the doubled top step of the ramp and nothing else uses it.
- **Display** (800, 48 px, line-height 1, letter-spacing -0.02em, width 100%): the `h1` size. The hero headline overrides this to 44 px on phones and 56 px from 600 px up so two lines fit the band; that override is the single exception to the ramp.
- **Headline** (800, 32 px, line-height 1, -0.02em): `h2` screen titles, the stats-strip and readout numbers (in sun-text), the level name.
- **Title** (800, 22 px, line-height 1, -0.02em): `h3` section heads (ruled above with a 2 px ink line), the masthead wordmark, the part points, the history-row score, the example-card title. Buttons use a 700-weight, 95%-width, 19 px cut of the same face.
- **Body** (400, 16 px, line-height 1.45): paragraphs, inputs and the select. Lead copy is 17 px; copy inside cards, notices, lists and tables runs at 15 px.
- **Label** (700, 13 px, letter-spacing 0.08em, uppercase, Atkinson): field labels, stat captions, table headers, the chip text (0.04em, no uppercase). Tab labels and the level stamp use Bricolage at 13 px instead (700 and 800, 0.06em and 0.04em, uppercase).

Canvas text follows the body face at 11 to 15 px scaled to the device pixel ratio; the report-card PNG (`app/js/report.js`) scales the same pairing up for a 1080-wide print, with the score at 220 px.

### Named Rules
**The Every-Number Rule.** Every number that is read as a result (score, points, stats, readouts, history) is set in Bricolage Grotesque 800. Body copy never carries a headline number.

**The Five-Step Rule.** Text sizes come from the five-step ramp (13, 16, 22, 32, 48 px) and the score at 96 px. The 15, 17 and 19 px cuts for dense copy, lead copy and button labels are the only in-between sizes the build uses; do not add more.

## Layout

A single phone column, 16 px gutters (`--gutter`), capped at 560 px and centred; from 600 px wide the gutters open to 24 px and the hero gains a 2 px ink frame and a 16:10 ratio, otherwise the flyer is the same at every width (confirmed at 390 and 1440). The masthead is sticky at the top on paper with a 3 px ink rule under it; the four-tab bar is fixed at the bottom, 72 px tall plus the safe-area inset, with a 3 px ink rule over it, and the main column pads its bottom by that height plus 28 px.

Vertical rhythm is set by rules, not by card gaps: 3 px rules open the masthead, the stats strip and the tab bar; 2 px rules close the stats strip, sit under every `h3`, under the masthead meta line, under the score block and under the level card; 1 px hairlines divide repeating rows. Spacing steps observed are 4, 8, 10, 12, 14, 16 and 22 px; 12 px is the default gap between stacked form controls and buttons, 10 px between list items, 22 px above a screen `h2`.

Three-cell strips (stats, readouts) are an equal-column grid ruled above (3 px), below (2 px) and between cells (2 px), numbers centred. Two-column grids (`.row`, `.compare`, and the form from 600 px up) use a 12 px gap. The hero bleeds to the gutters on phones (negative 16 px margin) at a fixed 390:236 ratio.

## Elevation & Depth

There are no shadows. The build has no `box-shadow`, `text-shadow`, `filter: drop-shadow`, blur or gradient anywhere; depth is conveyed by rule weight and by fill. The three fill levels are paper (page), paper-bright (anything that is a form or card) and paper-deep (empty tracks); the only overlay is the consent sheet, which is paper on a 62% ink scrim with a 4 px ink top rule (a 3 px ink border on all sides from 600 px up). The video stage is ink black so the overlay inks print on it like a print on dark card.

### Named Rules
**The Flat Print Rule.** Nothing lifts. A surface is distinguished from the page by a 2 px ink rule and a paper-bright fill, never by a shadow, a blur or a gradient.

**The Rule-Weight Rule.** Hierarchy of separation is 3 px ink (chrome and strip tops), 2 px ink (`--rule`, every control, card and section head), 1 px at 22% ink (row dividers). Nothing else.

## Shapes

Printed and cut square. Controls, cards, notices, chips, the range thumb and the checkbox all take a 3 px radius (`rounded.sm`), just enough to read as a print trim rather than a rounded widget. Meters, bars, strips, progress tracks, the active-tab bar and all rules are square (0 px). The level stamp is the one circle: a 58 px ring in 3 px aqua, rotated -8 degrees, with 13 px condensed uppercase lettering, printed like an inspector's stamp. The brand mark is two 15 px squares, aqua and orange, offset by 7 px and multiplied so their overlap prints green: the whole system in 22 px.

Borders are always 2 px ink on controls (`--rule`), 3 px on the lead tip card, and change colour to carry state: orange for a warning notice or a fix tip, overprint green for a good notice, aqua for the ghost button, sun-text for the danger button, hairline for a disabled button or an "ok" tip. Images are clipped by their card and the hero is clipped to its band; nothing else is masked.

## Components

Ordinary web controls dressed as print: flat fills, 2 px ink, one accent ink per control, pressed states that move by 1 px and darken slightly rather than glow.

### Buttons
- **Shape:** Trimmed square (3 px radius), 2 px ink border, full width, 56 px minimum height, 19 px Bricolage 700 at 95% width.
- **Primary:** Solid sun-orange fill with ink text (`button-primary`); the one orange block on a screen (Record or choose a video, Continue, the lead tip's drill button). The home button renders at 58 px with its border.
- **Secondary:** Paper-bright fill, ink border and text (`button-secondary`).
- **Ghost:** Transparent, aqua border, aqua-text label, 50 px tall, 17 px (`button-ghost`); used for every "see", "show", "export" and tab-jump action.
- **Danger:** Transparent with sun-text border and label (`button-danger`); only "Delete all" in Settings.
- **Pressed:** `translateY(1px)` and `brightness(.96)`; no hover treatment (touch first).
- **Disabled:** Paper-bright fill, hairline border, ink-tint label.
- **Focus:** 3 px aqua outline offset 2 px (global `:focus-visible`).

### Chips
- **Style:** 13 px Atkinson 700 at 0.04em, 8 x 12 px padding, paper-bright fill, 2 px ink border, 3 px radius.
- **State:** Selected inverts to ink fill with paper text (`chip-on`). Filters the history list by swimmer.

### Cards / Containers
- **Corner Style:** 3 px radius.
- **Background:** Paper-bright over the paper page.
- **Shadow Strategy:** None (see Elevation & Depth).
- **Border:** 2 px ink; colour carries state (orange warn, green good, hairline quiet). The lead tip card alone is 3 px ink at 19 px copy.
- **Internal Padding:** 12 px 14 px (notices, tips, example bodies); 14 px 16 px 16 px for the lead tip.

### Inputs / Fields
- **Style:** 50 px tall, paper-bright fill, 2 px ink border, 3 px radius, 16 px Atkinson, 12 px side padding; the select carries a 3 px-stroke ink chevron as an inline SVG background. Labels sit above in 13 px uppercase ink-tint.
- **Focus:** 3 px aqua outline, 2 px offset.
- **Range:** Transparent track element with a 4 px ink runnable track and a 28 px orange thumb with 2 px ink border and 3 px radius (24 px on Firefox).
- **Checkbox:** 22 px paper-bright square, 2 px ink border, 3 px radius; checked fills aqua with a 10 px ink square inside.
- **Error / Disabled:** No error state exists; refusal is a warning notice, not a field state.

### Navigation
- **Masthead:** Sticky paper bar, 3 px ink rule below, wordmark in 22 px Bricolage 800 with "Coach" in sun-text, the two-square overprint mark at left, the level stamp at right.
- **Tab bar:** Fixed, four equal cells on paper, 3 px ink rule on top, 72 px tall. Each tab is a 26 px inline SVG icon at 2.2 stroke (`stroke: currentColor`, round caps and joins) over a 13 px uppercase Bricolage 700 label at 0.06em in ink. The active tab turns sun-text and prints a 6 px orange bar across the top rule, inset 18 px from each side. No hover state.
- **Screens:** Sections toggled by `.active`, entering with a 160 ms fade-rise (opacity 0 to 1, 6 px up) on the exponential ease.

### Overprint Meter (signature)
A 14 px square track in paper-deep. The target zone is an aqua block from `--band` (default 80%, 85% on the level card) to the right edge, drawn as a pseudo-element. The reading is an inner `<i>` filled sun-orange at width `--w` with `mix-blend-mode: multiply`, so where it crosses into the aqua zone the paper prints overprint green. On the results screen the reading grows from zero over 600 ms on `cubic-bezier(.16, 1, .3, 1)` (`@keyframes grow`): the app's one authored motion. Used for each score part, the last-lap line on Home, and the level progress. Reduced motion removes the animation and the screen fade.

The same grammar is drawn on every canvas with `globalCompositeOperation = 'multiply'`: the angle chart fills the target band in aqua and strokes the scored stretch in 3 px orange over it (unscored frames are a 1 px ink hairline, the cursor a 2 px ink line and 4.5 px dot); the history chart fills 80 to 100 in aqua and prints orange bars over it; the readability strip prints paper-deep for unreadable, orange for standing, green for readable frames; the video overlay strokes the torso line 4 px orange and the dashed target line 3 px aqua on 5 to 7 px ink-edged paper bones with aqua joints; the report-card PNG repeats the palette and the multiply band on paper. Charts take the live values from the custom properties (`getPropertyValue('--sun')` and so on), so the CSS tokens are the single source.

### Level Stamp
A 58 px circle, 3 px aqua ring, aqua-text 13 px condensed uppercase label (Bricolage 800 at 75% width, 0.04em), rotated -8 degrees; pressed scales to 96%. The only rotated element and the only circle.

### Hero (Home)
The real backstroke frame (`app/assets/examples/backstroke_lap.jpg`, the owner's own photograph) converted to greyscale (`grayscale(1) contrast(1.15) brightness(1.02)`) and multiplied over a solid aqua block, so it prints as an aqua duotone; a transparent caption band carries a sun-orange pseudo-element multiplied over the photo so the band prints overprint green with the water showing through, and the headline sits on it in paper. Scaled 1.35 from the bottom edge on phones so the swimmer sits above the band; unscaled with a 2 px ink frame from 600 px up. A hidden canvas over it fades in the skeleton overlay once the model has read the frame.

## Do's and Don'ts

Shipping rasters are the owner's own photographs in `app/assets/examples/*.jpg` (six real frames, model-verified readings) and the YOLO11n-pose model; no generated rasters exist in this build. Constraints that hold the world: no framework, no build step, plain HTML with one CSS file and classic script tags, every element id used by `app/js/app.js` preserved. Voice from PRODUCT.md: plain, short, honest about limits, speaks to the parent, never scares.

### Do:
- **Do** draw every measurement as aqua target plus orange reading with multiply, in CSS (`mix-blend-mode: multiply`) or on canvas (`globalCompositeOperation = 'multiply'`), so good prints as overprint green.
- **Do** set every result number in Bricolage Grotesque 800 and every sentence in Atkinson Hyperlegible, from the five-step ramp (13, 16, 22, 32, 48 px); the score alone at 96 px.
- **Do** separate content with ink rules (3 px chrome, 2 px controls and sections, 1 px hairline rows) and flat paper-bright fills on a 3 px trim.
- **Do** use standard web controls (input, select, range, checkbox, button) styled with 2 px ink borders; one solid orange primary per screen, outlined aqua ghosts for everything secondary.
- **Do** keep targets at least 46 px tall (buttons 56, inputs 50, chips 8 x 12 padding, range thumb 28) and keep focus visible as a 3 px aqua outline, for wet one-handed use.
- **Do** read colours from the `:root` custom properties in any new canvas (`getPropertyValue`) so the stylesheet stays the single source of ink.
- **Do** ship only the owner's photographs and the model's own overlays as rasters; keep the greyscale-multiply treatment when a photo must sit in the world.

### Don't:
- **Don't** paint overprint green as a decorative fill; it is produced by overlap, and typed with `--over` only to say "good".
- **Don't** add a fourth colour for state (no red error, no yellow warning, no grey disabled); warn is sun-text, bad is ink, quiet is hairline.
- **Don't** use shadows, gradients, blurs, or a dark theme; the deck has no dark mode and the print has no depth.
- **Don't** use grey for secondary text; use the ink tint (`ink-2`) on paper.
- **Don't** add motion beyond the 600 ms meter grow and the 160 ms screen fade-rise; nothing else moves, and reduced motion removes both.
- **Don't** introduce icon fonts, glyph icons or a component library; icons are inline SVG at 2.2 stroke in `currentColor`, and there are four of them.
- **Don't** round beyond 3 px on anything but the level stamp; meters, bars and rules stay square.
