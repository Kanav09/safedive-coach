# SafeDive Coach: usability test plan

## Goals

1. Can a parent get from opening the app to a scored lap, with a clip they film themselves, following only the in-app guide?
2. Do they understand *why* the score is what it is, and what to do next?
3. Does the refusal message lead to a better second clip rather than to giving up?

## Participants

Five sessions, 30 minutes each, at the community pool during a Saturday lesson block (lifeguard on duty, shallow end). Recruit: four parents of beginner swimmers aged 6 to 12 (at least two who have never used a fitness or camera app beyond the phone's own), one swim instructor. Each parent brings their own swimmer; the swimmer must be able to do a back float or backstroke length. Consent for filming is explained and signed by the parent before the session (see `docs/PRIVACY.md`); clips stay on the participant's phone.

## Setup

The app served from a laptop on the pool's Wi-Fi; the participant opens the link on their own phone. Moderator stands beside them, does not touch the phone. A second team member records observations on the template below. Screen recording on the phone if the participant agrees.

## Tasks

| # | Task (read aloud) | Success | Measures |
|---|---|---|---|
| 1 | "Film your swimmer doing one length of backstroke, then get a score." | A score or a refusal with the right reason, with no moderator help | time to first result; number of hints; whether they read the filming guide first |
| 2 | "Score this clip instead" (moderator provides a 12 s clip from the camera roll, filmed from standing height, freestyle) | Participant recognises the refusal, finds the filming tip, says what they would change | did they re-film? did they blame themselves, the app, or the clip? |
| 3 | "Tell me what the score means and what you'd practise next." | Names the body-line idea in their own words and the drill | unprompted recall of the drill 10 minutes later (asked at the end) |
| 4 | "Try the drill with your swimmer for two minutes, then score another length." | Second lap scored; participant compares the two | did the scrubber or chart get used? did the second score move? |
| 5 | "Find both laps on the progress page and show me the first one." | Taps the correct bar or row | taps to find; confusion with chips if two names exist |

## Success metrics

- Task 1 completed without help by 4 of 5.
- Refusal in task 2 understood (participant proposes side-on or lower camera) by 4 of 5.
- Drill recalled unprompted at the end by 4 of 5.
- Median time to first result under 3 minutes including filming.
- No participant believes the app watches for drowning (checked by question 7).

## Script (moderator)

Welcome, consent, "there are no wrong answers, we are testing the app, not you." Explain think-aloud. Run tasks in order; on silence longer than 20 s ask "what are you thinking?" Only give a hint after two failed attempts, and log it. After task 5, the interview, then thanks.

## Data capture template (one row per task per participant)

```
participant | task | start | end | completed (Y/N/with help) | hints given | errors seen | quotes | notes
```
Plus per session: phone model, browser, clip length, readable % reported by the app, score(s), whether the model load time was noticed.

## Post-session interview

1. In one sentence, what does this app do?
2. What did the number mean to you?
3. What will you have your swimmer practise this week?
4. When the app refused to score, what did you think had happened?
5. Was there anything on the results page you did not understand or did not need?
6. Where would you expect to find older laps?
7. Is there anything the app watches for while your child is in the water? (Checks the "not a safety device" message landed.)
8. Would you use this again next Saturday? What would stop you?

## What we change based on the results

Refusal wording and the guide if task 2 fails; results page density if question 5 names the chart or the parts; threshold for "Strong lap" if instructors disagree with more than 2 of 10 body-line calls.
