# Session Flow — Implementation Plan

## Decisions (Locked)
- 15-second round, 3 × 5-second clips
- FE punch event logging via extended `usePoseLandmarker.js`
- webm→mp4 via ffmpeg on backend (<1s)
- Fire each clip to backend as it finishes recording (overlap processing with recording)
- TTS per coaching section, text always shown as fallback, TTS failure non-fatal
- Serve mp4 from backend for replay (precise seeking needed for `@start_s-end_s`)

---

## Agent Breakdown

### Agent 1: Backend Pipeline (independent — start immediately)
### Agent 2: FE Punch Event Logging (independent — start immediately)
### Agent 3: FE Session Flow (depends on Agent 2)
### Agent 4: FE Results Screen (depends on Agents 1 + 3)

**Parallelization**: Agents 1 and 2 run in parallel. Agent 3 after Agent 2. Agent 4 after Agents 1 + 3.

---

## Agent 1: Backend Pipeline

**Files to create/modify:**
- `backend/app.py` — new endpoints
- `backend/session_pipeline.py` — new file, orchestration logic
- `backend/coaching_parser.py` — new file, Nemotron markdown → structured sections

**Tasks:**

1. **ffmpeg conversion utility**: function `convert_webm_to_mp4(input_path, output_path)` using subprocess. Raise on failure.

2. **Coaching tip parser**: Parse Nemotron markdown output into structured list:
   ```python
   # Input: raw markdown from generate_coaching_tips.py
   # Output:
   [
     {
       "heading": "Guard drops on the cross",
       "start_s": 2.188,
       "end_s": 2.649,
       "body": "Keep your left hand up after throwing...",
       "clip_index": 0
     }
   ]
   ```
   Regex for headings: `#{1,3}\s+.*?@(\d+\.?\d*)s-(\d+\.?\d*)s`
   Sections without `@` tokens are "general" tips (no video segment).

3. **New endpoint `POST /api/live/session-clip`**:
   - Accepts: multipart `video` (webm blob) + `labels` (JSON string with `session_id`, `clip_index`, `clip_start_ms`, `clip_end_ms`, `punches[]`)
   - Steps:
     1. Save webm to `live_sessions/<session_id>/clips/clip_<N>.webm`
     2. ffmpeg convert to `clip_<N>.mp4`
     3. Run `classify_punch_windows()` from `punch_classifier.py` on the mp4
     4. Call `fetch_coaching()` from `generate_coaching_tips.py` with mp4 + classified labels
     5. Parse coaching markdown into sections via `coaching_parser.py`
     6. For each section with a timestamp, call `synthesize_speech_wav_bytes()` — save WAV to `live_sessions/<session_id>/tts/clip_<N>_section_<M>.wav`. **Catch exceptions** — if TTS fails, skip audio for that section, log warning.
     7. Save all outputs to session dir
     8. Return JSON:
       ```json
       {
         "status": "ok",
         "session_id": "abc123",
         "clip_index": 0,
         "classified_labels": { ... },
         "coaching_sections": [
           {
             "heading": "...",
             "start_s": 2.188,
             "end_s": 2.649,
             "body": "...",
             "tts_url": "/api/live/session/abc123/tts/0/0" or null
           }
         ],
         "coaching_raw_markdown": "..."
       }
       ```

4. **New endpoint `GET /api/live/session/<session_id>/video/<clip_index>`**:
   - Serve the mp4 file with range request support (copy pattern from existing `/api/replay/video`)

5. **New endpoint `GET /api/live/session/<session_id>/tts/<clip_index>/<section_index>`**:
   - Serve the WAV file

**Key constraints:**
- `generate_coaching_tips.py` currently has a `main()` that reads from disk. The agent needs to refactor `fetch_coaching()` to be callable directly with a video path and labels dict (it already accepts these as params — just import and call).
- Don't break existing endpoints.
- Use the existing `LIVE_SESSIONS` dir from `app.py`.

---

## Agent 2: FE Punch Event Logging

**Files to modify:**
- `frontend/src/hooks/usePoseLandmarker.js`

**Tasks:**

1. Add a `punchEventsRef = useRef([])` to store structured punch events.

2. At the punch detection point (around line 226-234, inside the `if ((fallen > DISTANCE_FALL_THRESHOLD || stalled) && gain >= MIN_PUNCH_DISTANCE_GAIN)` block), push an event:
   ```js
   punchEventsRef.current.push({
     start_ms: arm.punchStartTime,
     end_ms: now,
     side, // 'left' or 'right'
   })
   ```
   Note: `arm.punchStartTime` and `now` are `performance.now()` values — they need to be **relative to a session/clip start time**, not absolute. The agent should add a `clipStartTimeRef` that gets set when recording begins.

3. Expose two new functions via the hook return:
   - `getPunchEvents()` — returns the current array and clears it (for clip boundary slicing)
   - `setClipStartTime()` — sets the reference time so punch timestamps are relative to clip start

4. On `resetPunchCount`, also clear `punchEventsRef`.

**Key constraint:** `performance.now()` is the time source. Punch `start_ms` and `end_ms` must be relative to clip start (i.e. `arm.punchStartTime - clipStartTimeRef.current`). The consumer (Agent 3) will call `setClipStartTime()` at the start of each 5s clip.

---

## Agent 3: FE Session Flow

**Files to create/modify:**
- `frontend/src/hooks/useSessionRound.js` — new hook, session state machine
- `frontend/src/pages/LiveAnalysisPage.jsx` — wire up session UI
- `frontend/src/components/LiveCamera.jsx` — expose recording + punch event methods via ref

**Tasks:**

1. **`useSessionRound` hook** — state machine:
   ```
   idle → countdown (3s) → recording (15s) → processing → results
   ```
   - `idle`: "Start Round" button visible
   - `countdown`: 3-2-1 overlay on camera
   - `recording`: 
     - Starts camera if not live
     - Resets punch count
     - Records 3 × 5s clips via MediaRecorder
     - At each 5s boundary: stop recorder, grab punch events since last boundary, POST to `/api/live/session-clip`, start new recorder
     - Shows live timer (15s countdown) + live punch count
     - Generates a `session_id` (timestamp-based)
   - `processing`: 
     - "Analyzing your round..." loading screen
     - `Promise.all` on the 3 in-flight backend requests
     - Collect all responses into session results object
   - `results`: pass results to results screen

2. **MediaRecorder management**:
   - Use `supportedRecordingType()` from `LiveCamera.jsx` (extract to shared util)
   - At each 5s mark: `recorder.stop()` → get blob from `onstop` → immediately start new recorder
   - Fire POST to backend with: `{ session_id, clip_index, clip_start_ms, clip_end_ms, punches: getPunchEvents() }`
   - Don't await the POST — store the promise, await all at end

3. **LiveCamera.jsx changes**:
   - Expose `stream` via ref (needed for MediaRecorder)
   - Expose `getPunchEvents` and `setClipStartTime` from pose hook via ref

4. **LiveAnalysisPage.jsx changes**:
   - Add "Start Round" button
   - Show countdown overlay
   - Show recording timer + live punch count during round
   - Show processing spinner
   - When results ready, switch to results view (Agent 4's component)

**Key constraints:**
- MediaRecorder `stop()` is async — the `dataavailable` event fires after `stop()`. Handle this carefully.
- Punch events from `usePoseLandmarker` must use the clip-relative timestamps.
- The labels JSON sent to backend must match the format in `clip_1_labels.json` (with `clip_index`, `clip_start_ms`, `clip_end_ms`, `punches[]` with `start_ms`, `end_ms`).

---

## Agent 4: FE Results Screen

**Files to create/modify:**
- `frontend/src/components/RoundResults.jsx` — new component
- `frontend/src/pages/LiveAnalysisPage.jsx` — render results component when state is `results`

**Tasks:**

1. **Round stats header**:
   - Total punches across all clips
   - Breakdown by type (from classified labels)
   - Round duration
   - Clean, bold layout matching existing design system (Material Design tokens, `font-headline-md`, etc.)

2. **Coaching tip carousel** (the main feature):
   - Flat list of all coaching sections across all 3 clips (ordered by clip, then by time)
   - One tip shown at a time
   - For each tip with a timestamp:
     - `<video>` element loads `/api/live/session/<session_id>/video/<clip_index>`
     - Video loops between `start_s` and `end_s` using `timeupdate` event to reset `currentTime`
     - Coaching text displayed below/beside video
     - If `tts_url` exists, auto-play audio; show speaker icon to replay
   - For general tips (no timestamp): show text only, no video
   - Navigation: "Previous" / "Next" buttons, current index indicator (e.g. "Tip 3 of 8")
   - Playback speed: 0.25x, 0.5x, 1x buttons (sets `video.playbackRate`)

3. **Video loop implementation** (critical for smoothness):
   ```js
   // On timeupdate, if currentTime >= end_s, seek back to start_s
   videoRef.current.addEventListener('timeupdate', () => {
     if (videoRef.current.currentTime >= end_s) {
       videoRef.current.currentTime = start_s
     }
   })
   ```
   On tip change: update start_s/end_s, seek to new start_s, play.

4. **TTS playback**:
   - Fetch WAV from `tts_url`, play via `Audio` object
   - Show play/pause button for manual control
   - Auto-play on tip entry (if audio available)
   - If `tts_url` is null, show "Audio unavailable" badge — not an error

5. **"New Round" button**: resets state machine back to `idle`

6. **Polish**:
   - Smooth fade transitions between tips
   - Loading skeleton while video loads
   - Mobile-responsive layout
   - Match existing design system (surface containers, primary colors, label fonts)

**Key constraints:**
- `timeupdate` fires ~4x/sec — for sub-second loop precision, may need `requestAnimationFrame` polling instead. Test and decide.
- When switching tips across clips, the `<video>` `src` changes — need to wait for `loadeddata` before playing.
- TTS audio and video loop should feel synchronized but don't need to be frame-perfect.

---

## Mock API Mode (for testing without spamming NVIDIA)
- Backend env var: `MOCK_API=1` (or `--mock` flag)
- On real API call: save Nemotron response + TTS WAV to `backend/mock_cache/<session_id>/clip_<N>/`
- On mock mode: return cached response from `mock_cache/` (most recent matching clip index)
- YOLO runs normally in both modes (local model, no API cost)
- If no cache exists in mock mode, return a placeholder coaching response

## FE Debug Panel
- Toggle via `?debug=1` query param or a keyboard shortcut
- Shows collapsible panel with:
  - Raw session state (phase, sessionId, clipIndex)
  - Per-clip: raw labels JSON, classified labels, coaching markdown, TTS URLs
  - Timing info (when each clip was sent, when response arrived)
  - Errors per clip

## Execution Order

```
Wave 1 (parallel):  Agent 1 (Backend)  +  Agent 2 (Punch Events)
Wave 2:             Agent 3 (Session Flow) — after Agent 2
Wave 3:             Agent 4 (Results Screen) — after Agents 1 + 3
```
