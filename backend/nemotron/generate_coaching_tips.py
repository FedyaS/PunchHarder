import os
import re
import sys
import json
import time
import base64
from typing import Optional
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

RUN_NAME = datetime.now().strftime("%Y%m%d_%H%M%S")
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUTS_DIR = os.path.join(SCRIPT_DIR, "outputs", f"coaching_{RUN_NAME}")
MOCK_INPUTS_DIR = os.path.join(SCRIPT_DIR, "mock_inputs")
LABELS_DIR = os.path.join(SCRIPT_DIR, "labels")

MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"

CLIP_MP4_RE = re.compile(r"^clip_(\d+)\.mp4$", re.IGNORECASE)

COACHING_PROMPT_TEMPLATE = """You are an expert boxing coach reviewing a short shadowboxing clip.

The punch log below was produced by the athlete's tracking pipeline (not by you). Treat it as the source of truth for **what** was thrown and **when**. Your job is to **watch the video** and give **natural-language coaching**: form, guard, balance, hip rotation, head movement, rhythm, and how well execution matches the intended techniques in the log.

Punch log for this clip (times in ms from clip start):
{punch_log}

## Required time format for specific feedback
Whenever you cite a **concrete** moment or interval the athlete should re-watch (a mistake, weak rep, or good example tied to timing), you MUST tag it using **exactly** this pattern — ASCII digits, lowercase `ms`, single hyphen `-`, no spaces inside the token, prefix `@`:

  @<start_ms>ms-<end_ms>ms

Examples: `@3095ms-3238ms`  `@2188ms-2649ms`

- Prefer start/end times taken from the punch log intervals when they apply; otherwise estimate from the video but keep this same token shape.
- For a single instant, repeat the same number: `@3095ms-3095ms`.
- Put one token next to the sentence that explains the issue (beginning or end of the sentence is fine).
- Do **not** use other styles for those moments: no `3.1s`, no `(2188-2649 ms)` only, no `→` ranges, no en-dashes as separators. Plain prose without a timestamp is OK for general advice that is not tied to one interval.

Write coaching feedback the athlete can use in the next round. Use clear sections with short headings (plain text or markdown `#` headings). Do **not** output JSON, code fences, or a revised punch list. Do not invent punches that contradict the log; if something in the video is unclear, say so briefly."""


def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


def discover_clip_mp4s(directory: str) -> list[tuple[int, str]]:
    if not os.path.isdir(directory):
        return []
    found: list[tuple[int, str]] = []
    for name in os.listdir(directory):
        m = CLIP_MP4_RE.match(name)
        if not m:
            continue
        idx = int(m.group(1))
        found.append((idx, os.path.join(directory, name)))
    found.sort(key=lambda x: x[0])
    return found


def load_labels_for_clip(clip_index: int) -> Optional[dict]:
    path = os.path.join(LABELS_DIR, f"clip_{clip_index}_labels.json")
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def format_punch_log(labels: Optional[dict]) -> str:
    if not labels:
        return "(No punch log file was provided for this clip.)"
    punches = labels.get("punches") or []
    if not punches:
        return "(Punch log is empty.)"
    lines = []
    for i, p in enumerate(punches, start=1):
        t = p.get("type", "?")
        s = p.get("start_ms", 0)
        e = p.get("end_ms", s)
        lines.append(f"  {i}. {t}: {s}ms-{e}ms")
    summary = {}
    for p in punches:
        t = p.get("type", "unknown")
        summary[t] = summary.get(t, 0) + 1
    summary_bits = ", ".join(f"{k}×{v}" for k, v in sorted(summary.items()))
    return f"Total punches: {len(punches)} ({summary_bits})\n" + "\n".join(lines)


def video_to_base64(path: str) -> str:
    with open(path, "rb") as f:
        return f"data:video/mp4;base64,{base64.b64encode(f.read()).decode('utf-8')}"


def fetch_coaching(
    client: OpenAI,
    clip_index: int,
    video_path: str,
    labels: Optional[dict],
) -> tuple[str, dict, float]:
    punch_log = format_punch_log(labels)
    prompt = COACHING_PROMPT_TEMPLATE.format(punch_log=punch_log)

    log(f"Clip {clip_index}: sending {os.path.basename(video_path)}...")

    video_b64 = video_to_base64(video_path)
    log(f"  Payload (base64): ~{len(video_b64) // 1024} KB")

    t0 = time.time()
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a boxing coach. Respond with helpful coaching text only. "
                    "No JSON, no punch detection tables. "
                    "For every specific clip interval you flag, include the exact token "
                    "@<start>ms-<end>ms (ASCII hyphen) as instructed in the user message."
                ),
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "video_url", "video_url": {"url": video_b64}},
                ],
            },
        ],
        temperature=0.2,
        max_tokens=4096,
        extra_body={
            "chat_template_kwargs": {"enable_thinking": False},
            "top_k": 1,
        },
    )
    elapsed_s = time.time() - t0

    usage = response.usage
    tokens = {
        "prompt_tokens": usage.prompt_tokens if usage else 0,
        "completion_tokens": usage.completion_tokens if usage else 0,
        "total_tokens": usage.total_tokens if usage else 0,
    }
    content = (response.choices[0].message.content or "").strip()
    return content, tokens, elapsed_s


def main():
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        log("ERROR: NVIDIA_API_KEY not set. Add it to .env or export it.")
        sys.exit(1)

    os.makedirs(OUTPUTS_DIR, exist_ok=True)

    clips = discover_clip_mp4s(MOCK_INPUTS_DIR)
    if not clips:
        log(f"ERROR: No clip_*.mp4 files found under {MOCK_INPUTS_DIR}")
        log("Add files like clip_0.mp4, clip_1.mp4 next to the mock JSON inputs.")
        sys.exit(1)

    client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=api_key)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    session_start = time.time()

    log("=== Nemotron coaching tips (video + label punch log) ===")
    log(f"Model: {MODEL}")
    log(f"Outputs: {OUTPUTS_DIR}")
    log("")

    total_tokens = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    sections: list[str] = []

    for clip_index, video_path in clips:
        labels = load_labels_for_clip(clip_index)
        if labels is None:
            log(f"  WARN: missing {LABELS_DIR}/clip_{clip_index}_labels.json — coaching without punch log")

        coaching, tokens, elapsed_s = fetch_coaching(client, clip_index, video_path, labels)
        for k in total_tokens:
            total_tokens[k] += tokens[k]

        log(f"  Done in {elapsed_s:.1f}s — completion tokens: {tokens['completion_tokens']}")

        per_path = os.path.join(OUTPUTS_DIR, f"clip_{clip_index}_coaching.txt")
        with open(per_path, "w", encoding="utf-8") as f:
            f.write(coaching)
        log(f"  Wrote {per_path}")

        sections.append(
            f"## Clip {clip_index} — {os.path.basename(video_path)}\n\n{coaching}\n"
        )
        log("")

    combined_path = os.path.join(OUTPUTS_DIR, f"coaching_session_{timestamp}.md")
    with open(combined_path, "w", encoding="utf-8") as f:
        f.write(f"# Coaching session {timestamp}\n\n")
        f.write(f"Clips processed: {len(clips)}\n\n")
        f.write("\n".join(sections))

    session_elapsed = time.time() - session_start
    log("=== SUMMARY ===")
    log(f"Session time: {session_elapsed:.1f}s")
    log(
        f"Tokens — prompt: {total_tokens['prompt_tokens']}, "
        f"completion: {total_tokens['completion_tokens']}, "
        f"total: {total_tokens['total_tokens']}"
    )
    log(f"Combined markdown: {combined_path}")


if __name__ == "__main__":
    main()
