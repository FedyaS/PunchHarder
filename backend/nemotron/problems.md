# Nemotron Testing — What Works and What Doesn't

Model: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`
API: `integrate.api.nvidia.com/v1` (OpenAI SDK)

---

## What Works

- **Thinking disabled (Run 4)**: `chat_template_kwargs: { enable_thinking: False }` successfully disables reasoning. All 3 clips returned clean JSON with `reasoning_content: null`. No truncation, no loops.
- **JSON output**: When thinking is off, the model reliably returns valid JSON matching the requested schema.
- **Punch count hint**: Telling the model "approximately N punches" gets it to return roughly that many entries.
- **Form notes**: Guard discipline, rhythm consistency, and brief observations are consistently returned.
- **Video ingestion**: 10s clips at ~3-4MB each are accepted without issues.

## What Doesn't Work

- **Punch detection accuracy**: The model does NOT actually detect individual punches from video. It sees ~3-6 sampled frames and fabricates a plausible pattern to match the count hint. All clips show repeating jab-cross or jab-only patterns with evenly spaced timestamps — clearly not real detection.
- **Punch type variety**: With thinking off, the model defaults to labeling everything as "jab". Run 4 returned 13/14/8 jabs across all 3 clips — no crosses, hooks, or uppercuts detected.
- **Reasoning mode + video is unstable**: With thinking enabled, the model randomly enters infinite reasoning loops. This is non-deterministic — the same clip succeeds in one run and fails in the next.
- **`enable_thinking: False` as a flat param is ignored**: Must be nested inside `chat_template_kwargs`. The flat `extra_body` version does nothing.

## Thinking vs Not Thinking

| | Thinking ON | Thinking OFF |
|---|---|---|
| **Param** | default (no extra_body) | `chat_template_kwargs: { enable_thinking: False }` |
| **Reliability** | ~66% (1 of 3 clips fails per run) | 100% (all clips succeed) |
| **Avg response time** | 12-22s per clip | 10-16s per clip |
| **Total session (3 clips)** | 36-66s | 42s |
| **Avg completion tokens** | 1600-5500 (reasoning eats most) | 500-850 (all content) |
| **Total tokens (3 clips)** | 7500-17600 | 4520 |
| **Failure mode** | Reasoning loop → content: null, finish_reason: "length" | None observed |
| **Punch type diversity** | Fabricated but varied (jab/cross/hook/uppercut) | Almost all jabs |

## Token Usage by Run

| Run | Thinking | max_tokens | Total Tokens | Completion Tokens | Failures |
|---|---|---|---|---|---|
| Run 1 | ON | 2048 | 7,498 | 5,265 | clip 1 truncated |
| Run 2 | ON | 8192 | 17,658 | 15,324 | clip 1 reasoning loop |
| Run 3 | ON (flat param ignored) | 4096 | ~10,500 | ~8,300 | clip 2 empty |
| Run 4 | OFF (correct param) | 4096 | 4,520 | 2,174 | none |

## Recommended Settings

```python
response = client.chat.completions.create(
    model="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    messages=[...],
    temperature=0.2,
    max_tokens=4096,
    extra_body={
        "chat_template_kwargs": {"enable_thinking": False},
        "top_k": 1,
    },
)
```

## Key Takeaway

Nemotron is **not suitable for per-punch detection** from video. It should receive the punch log from MediaPipe/YOLOv8 and focus on what it's good at: watching the video and providing **natural language coaching feedback on form and technique**. Punch counting, labeling, and velocity tracking should be handled entirely by the FE (MediaPipe) and BE (YOLOv8) pipeline.
