# Punch Detection Algorithm - Tuning Guide

## Approach
- Per arm: track max(wrist-to-shoulder, wrist-to-hip) normalized by shoulder width
- Two states: resting / punching
- Rising distance = punch starting, falling from peak = punch ending
- Bad frames skipped (not reset) unless many consecutive

## Thresholds (lines 9-16 of usePoseLandmarker.js)

| Constant | Current | What it does | To reduce sensitivity |
|----------|---------|--------------|----------------------|
| DISTANCE_RISE_THRESHOLD | 0.12 | How much the wrist must move outward from baseline to trigger "punch started" | Increase (e.g. 0.18-0.25) |
| MIN_PUNCH_DISTANCE_GAIN | 0.15 | Minimum total outward travel (peak - baseline) for a punch to count | Increase (e.g. 0.20-0.30) |
| DISTANCE_FALL_THRESHOLD | 0.06 | How much distance must drop from peak to confirm punch ended | Increase slightly if ending too early |
| COOLDOWN_MS | 500 | Time after a punch before another can register (same arm) | Increase to prevent double-counts |
| BASELINE_FREEZE_MS | 400 | After a punch, baseline won't update for this long (prevents retraction triggering new punch) | Increase if still double-counting |
| SMOOTHING | 0.5 | EMA weight on previous value (higher = smoother/laggier, lower = more responsive/noisier) | Increase toward 0.6-0.7 for less noise |

## For "too sensitive standing still" problem
- Increase DISTANCE_RISE_THRESHOLD (most impactful)
- Increase MIN_PUNCH_DISTANCE_GAIN
- Increase SMOOTHING

## For "double counting" problem
- Increase COOLDOWN_MS
- Increase BASELINE_FREEZE_MS
- Increase DISTANCE_FALL_THRESHOLD
