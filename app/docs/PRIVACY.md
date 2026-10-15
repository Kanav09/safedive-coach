# SafeDive Coach: privacy and consent

## The short version

Video of children is the most sensitive thing this app touches, so the design is: never have it. The clip is opened by the browser on the phone, the pose model runs on the phone, and only a few numbers per lap are stored, on the phone. There is no account, no server and no analytics.

## What is stored, and where

| Data | Where | How long | Why |
|---|---|---|---|
| The video clip | Browser memory only, as an object URL | Until the tab is closed or another clip is chosen | Needed to read frames |
| Per-frame keypoints and the best frame | Browser memory only | Until the next lap or the tab closes | The scrubber and report card |
| Per lap: date, name if typed, stroke, score, body angle, readable %, issue keys | `localStorage` on the device | Until "Delete all" or the browser's site data is cleared | Progress screen |
| Consent timestamp, last swimmer name | `localStorage` | Same | Skip the sheet next time, prefill the name |

Nothing is encrypted at rest beyond what the device does, because nothing identifying is stored beyond a first name the parent chose to type. The report card and JSON leave the device only when the parent explicitly shares or copies them.

## Retention options

Offered: keep until deleted (default), delete all now (Settings). Not offered: 30/90/365-day auto-delete, because there is no video to age out and a progress chart with holes in it is worse than none. If a shared-device use case appears (a swim school tablet), add a per-swimmer delete and a 90-day default.

## Consent text, adults

> Film only yourself or people who have agreed to be filmed. SafeDive Coach reads the clip on this device and keeps only the scores.

## Consent flow, minors (as built: first-run sheet)

> **Before you start.** Video never leaves this device. The app reads the swimmer's body position right here and keeps only the scores. **Film your own swimmer.** For a child, that means you are the parent or guardian, or have their say-so. SafeDive Coach is a swim-form helper. It is not a safety device and does not watch for drowning. An adult must always be watching the water.
> [ ] I understand and I'm allowed to film this swimmer. [Continue]

The checkbox must be ticked before Continue enables. The consent is stored as a timestamp and shown again only after site data is cleared.

Guardian consent is asserted by the adult holding the phone. We considered asking for the child's name and age to gate under-13 use and decided against collecting more data to protect data.

## Other people in the frame

The guide asks for one swimmer in the shot. The model follows the most confident person and ignores the rest; nothing about bystanders is stored. The report card shows the best frame, which can include people in the background; the Settings text asks parents not to share a clip or card with other children in it without asking.

## Anonymisation and opt-out

The name field is optional and can be left blank; the record then says `null`. Delete all removes every lap. There is nothing to opt out of upstream because nothing goes upstream.

## Settings screen copy (as built)

> **Where your video goes: nowhere.** The clip is opened by the browser on this device, the pose model runs here, and only the scores (a few numbers and a date) are kept in this browser's storage. Close the tab and the video is gone.
> **Consent.** Film only swimmers you are responsible for, or who have agreed. For anyone under 18 that means a parent or guardian is doing the filming or has said yes. Do not film other people's children in the background if you can avoid it, and never share a clip without asking.
> **Your data.** N scored laps stored on this device since DATE. [Delete all scored laps on this device]

## Verifying the promise

Open the browser's network tab, score a lap. The only requests are the page's own files (model, runtime, images). No request is made during analysis.
