# Test Mode — Implementation Plan

## Summary
FE-driven test mode that replays a saved session through the full UI flow (countdown → recording → processing → results) without needing a camera or punching for 15s, and without hitting NVIDIA APIs.

---

## 1. Backend: per-request mock flag

**File: `backend/session_pipeline.py`**
- Change `is_mock_mode()` → `is_mock_mode(request_mock: bool | None = None)`
- If `request_mock` is explicitly True → mock
- Else fall back to `MOCK_API` env var (kept as force-always-mock safety net)
- `process_session_clip()` accepts an optional `mock` kwarg and passes it through

**File: `backend/app.py`**
- `/api/live/session-clip` and `/api/live/session-resend/<sid>`: read `mock` from request JSON/form field, pass to pipeline
- Add `logging.basicConfig(level=logging.DEBUG, format="%(asctime)s %(name)s %(levelname)s %(message)s")` near top so `session_pipeline` log.info/debug calls appear in Flask console

## 2. Backend: resend endpoint returns same shape as live

**File: `backend/app.py`**
- `/api/live/session-resend/<sid>` already exists and returns `{ session_id, clips: [...] }` — just make sure each clip entry has the same shape as `/api/live/session-clip` response (it already does)
- Accept `mock` field from request body, pass through to `process_session_clip()`

## 3. Frontend: test mode toggle + session picker

**File: `frontend/src/components/DebugPanel.jsx`**
- Add a "Test Mode" toggle (persisted to `localStorage`)
- When on, show a session picker dropdown (from `/api/live/sessions`)
- Expose `testMode` and `selectedSession` to parent via a callback prop or context

**File: `frontend/src/pages/LiveAnalysisPage.jsx`**
- Thread `testMode` and `selectedSession` from DebugPanel into `useSessionRound`

## 4. Frontend: synthetic round in test mode

**File: `frontend/src/hooks/useSessionRound.js`**
- Accept `testMode` and `testSessionId` options
- When `testMode` is on and `startRound()` is called:
  - Skip camera entirely
  - Run synthetic countdown (1s) + fake recording progress bar (~2s)
  - Then call `POST /api/live/session-resend/<testSessionId>` with `{ mock: true }`
  - Feed response into `setResults()` → transition to `phase='results'`
- Normal flow unchanged when test mode is off

## 5. Fix: resend panel → results screen

**File: `frontend/src/components/DebugPanel.jsx`**
- Existing `ResendPanel` resend button: instead of (or in addition to) showing JSON, call a parent callback like `onResendResults(data)` that sets `sessionResults` + `phase='results'` in LiveAnalysisPage
- This fixes the Ctrl+D resend never navigating to results

---

## Files changed
| File | Change |
|------|--------|
| `backend/session_pipeline.py` | `is_mock_mode()` accepts per-request flag |
| `backend/app.py` | Pass `mock` from request, add logging config |
| `frontend/src/hooks/useSessionRound.js` | Synthetic round when testMode=true |
| `frontend/src/components/DebugPanel.jsx` | Test mode toggle, session picker, resend→results wiring |
| `frontend/src/pages/LiveAnalysisPage.jsx` | Thread test mode state, handle resend results callback |
