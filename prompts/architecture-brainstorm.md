# PunchHarder Architecture Brainstorm

## Round Structure
- 1 round = 30 seconds of active shadowboxing
- During round: batch 10-second video clips to Nemotron (3 clips per round)
- Each clip includes punch summary JSON alongside video
- After round ends: final summary model call aggregates all clip feedback into one report

## Nemotron Batching (Locked: Option C — Hybrid)
- **Min interval**: 10s
- **Max interval**: 30s
- **Punch threshold**: 8 punches (triggers early if min interval passed)
- All configurable via settings/env vars
- FE keeps rolling MediaRecorder buffer, slices on demand

## Clip Payload → Nemotron
```json
{
  "session_id": "abc123",
  "round_number": 1,
  "clip_index": 0,
  "clip_start_ms": 0,
  "clip_end_ms": 10000,
  "video": "<base64 or multipart binary>",
  "punches": [
    {
      "type": "jab",
      "confidence": 0.92,
      "velocity": 12.3,
      "power": 78.5,
      "timestamp_ms": 1420
    }
  ]
}
```

## Feedback Schema — Per-Clip (from Nemotron)
```json
{
  "clip_index": 0,
  "clip_summary": "Good jab speed but dropping guard after hooks.",
  "form_notes": {
    "jab": { "score": 82, "note": "Extend fully, snap back faster" },
    "hook": { "score": 61, "note": "Dropping left hand after throw" }
  },
  "guard_discipline": 0.65,
  "rhythm_consistency": 0.78
}
```

## Feedback Schema — Round Summary (aggregated by summary model)
```json
{
  "session_id": "abc123",
  "round_number": 1,
  "overall_score": 74,
  "level": "intermediate",
  "overall_advice": "Focus on keeping your guard up between combinations. Your jab is fast but your hooks need more hip rotation.",
  "punch_stats": {
    "total": 23,
    "by_type": {
      "jab": { "count": 12, "avg_power": 65.2, "max_power": 89.1 },
      "cross": { "count": 6, "avg_power": 72.0, "max_power": 95.3 },
      "hook": { "count": 4, "avg_power": 58.7, "max_power": 71.2 },
      "uppercut": { "count": 1, "avg_power": 44.0, "max_power": 44.0 }
    }
  },
  "form_by_type": {
    "jab": { "score": 82, "improvements": ["Snap hand back faster", "Keep chin tucked"] },
    "cross": { "score": 76, "improvements": ["Rotate hips more", "Full extension"] },
    "hook": { "score": 61, "improvements": ["Dropping guard after throw", "Tighten elbow angle"] },
    "uppercut": { "score": 55, "improvements": ["Drive from legs not arm", "Keep other hand up"] }
  },
  "combos_detected": ["jab-cross", "jab-cross-hook", "jab-jab"],
  "guard_discipline": 0.65,
  "rhythm_consistency": 0.72
}
```

## Testing Plan (No FE Required)
1. Record 2-3 mock shadowboxing clips (phone camera, 10s each)
2. Create mock punch data JSON (timestamps, types, velocities, confidence)
3. Build a Python test script that:
   - Sends clip + mock data to Nemotron endpoint
   - Validates response parses into feedback schema
   - Measures latency per clip
4. Build batching simulator:
   - Replays a 30s session as 3 × 10s clips
   - Fires them at correct intervals
   - Collects per-clip feedback
   - Sends all 3 to summary model
   - Outputs final round summary
5. Validate: schema correctness, latency, token usage, output quality

## Open Questions
- [ ] Nemotron max video input size/duration?
- [ ] Does Nemotron accept raw video or need extracted frames?
- [ ] How to compute "power" from velocity + pose data?
- [ ] Should feedback accumulate across rounds (session memory)?
- [ ] Combo detection: FE-side pattern matching or Nemotron responsibility?
