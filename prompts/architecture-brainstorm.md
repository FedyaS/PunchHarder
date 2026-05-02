# PunchHarder Architecture Brainstorm

## Nemotron Video Batching Strategy

### Problem
Send video to Nemotron for form feedback. Needs to feel live but not spam the API.

### Option A: Fixed Interval (e.g. every 15s)
- Simple timer, sends last N seconds of video
- Predictable API cost
- Feedback arrives in chunks, may feel delayed

### Option B: Punch-Count Triggered (e.g. every 10 punches)
- Feedback correlates to activity bursts
- Idle periods = no wasted calls
- Uneven timing — could be 5s or 60s between calls

### Option C: Hybrid (timer + punch threshold, whichever comes first)
- Configurable: `minIntervalSec`, `maxIntervalSec`, `punchThreshold`
- Defaults: min 10s, max 30s, threshold 8 punches
- Debounce: if last feedback was <minInterval ago, queue it
- Best of both — responsive during action, quiet during rest

### Video Clip Constraints
- Max clip length: 15-30s (Nemotron input limits TBD, need to test)
- Resolution: downscale to 480p or 720p before sending
- Format: mp4 (h264) or webm
- FE maintains a rolling buffer (MediaRecorder), slices on demand

### Payload to Nemotron
```
Video clip (mp4/webm binary)
+ JSON context:
{
  "punches": [
    { "type": "jab", "velocity": 12.3, "timestamp_ms": 1420 },
    ...
  ],
  "clip_start_ms": 0,
  "clip_end_ms": 15000,
  "session_id": "abc123"
}
```

### Testing Plan
- **Unit**: Mock Nemotron endpoint, test batching logic fires at correct intervals
- **Integration**: Record a 60s test video, replay frames through the system, verify N feedback responses come back
- **Rate/size**: Log payload sizes and API call frequency during a real session
- **Latency**: Measure round-trip from clip-send to feedback-received
- **Config surface**: Expose batching params in a settings panel or env vars for tuning

### Open Questions
- [ ] What is Nemotron's actual max video input size/duration?
- [ ] Does Nemotron accept video directly or do we need to extract frames?
- [ ] Should feedback accumulate across the session (send prior context)?
