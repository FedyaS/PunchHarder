# Results View Improvements

## Items

### 1. Bigger video player
- Currently `lg:w-1/2` inside coaching carousel — video is small
- Options: full-width video above text, or 2/3 split, or expand to full screen on click

### 2. Clip padding (longer clips)
- `CLIP_DURATION_MS = 5000` in `useSessionRound.js` — currently 5s per clip, 3 clips = 15s round
- VideoLooper loops `startS → endS` from coaching timestamps
- Padding: add ~0.3-0.5s before `start_s` and after `end_s` when looping (FE-only, no backend change needed)

### 3. Speed 0.1x default
- `SPEED_OPTIONS = [0.25, 0.5, 1]` → add 0.1, make it default
- Default `speed` state: `useState(0.1)` instead of `useState(1)`

### 4. Punch table with icons
- Currently stat cards in a flex row. Punch types: jab, cross, hook, uppercut, unknown
- Already have `PUNCH_ICONS` map. Need: proper table showing each punch with side, type, confidence, timestamp

### 5. Label each coaching tip with punch type
- Coaching sections have `start_s`/`end_s` — can cross-reference with `classified_labels.punches` by overlapping timestamps
- Need to pass `classified_labels` through to sections in `flattenSections`

### 6. Larger fonts throughout

### 7. Overall round score + skill level badge
- Separate Nemotron call (cheap/fast model) after all 3 clips processed
- Input: all classified_labels + coaching markdown from all clips
- Output: JSON `{ score: 0-100, level: "beginner"|"novice"|...|"world_class", summary: "..." }`
- Levels: Beginner → Novice → Intermediate → Advanced → Professional → World Class

#### Backend approach
- New function `score_round()` in `session_pipeline.py`
- New endpoint: `POST /api/live/session/{id}/score`
  - Reads saved classified labels + coaching from disk
  - Fires Nemotron scoring call, returns `{ score, level, summary }`
  - Mock mode: returns a cached/hardcoded score
- `session_resend` also calls `score_round()` inline, includes in response
- FE fires the score endpoint as soon as all clip promises resolve (parallel with nothing blocking)
- FE merges score into `sessionResults`, displays in RoundResults

#### Timing
- Runs in parallel with TTS inside `process_session_clip` (TTS is per-section, scoring is round-level)
- In `session_resend`: call `score_round()` after clip loop, before jsonify
- In live mode: FE fires `/score` after all clip posts return

### 8. Safety: no breaking changes
- All FE changes in `RoundResults.jsx` (self-contained component)
- Speed default + padding are safe additions
- Punch table is additive
- Score is new section, additive — FE gracefully handles missing score data
- New backend endpoint is additive, existing endpoints unchanged
