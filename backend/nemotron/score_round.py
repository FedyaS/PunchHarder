"""Score a full round using a text-only Nemotron call (no video)."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from openai import OpenAI

log = logging.getLogger(__name__)

SCORING_MODEL = "nvidia/llama-3.3-70b-instruct"

SCORING_PROMPT = """You are an expert boxing analyst. Given the punch classification data and coaching notes from a 15-second shadowboxing round, produce a JSON score.

## Punch data (all clips combined)
{punch_data}

## Coaching notes
{coaching_notes}

## Instructions
Evaluate the athlete on:
- Punch volume and variety (are they throwing different types?)
- Classification confidence (higher YOLO confidence = cleaner technique)
- Form issues noted by the coach (fewer issues = better)
- Rhythm and timing

Return ONLY valid JSON (no markdown fences, no explanation outside the JSON):
{{
  "score": <integer 0-100>,
  "level": "<one of: beginner, novice, intermediate, advanced, professional, world_class>",
  "summary": "<1-2 sentence assessment>"
}}"""


def format_punch_data_for_scoring(all_classified_labels: list[dict]) -> str:
    lines = []
    for labels in all_classified_labels:
        clip_idx = labels.get("clip_index", "?")
        punches = labels.get("punches", [])
        lines.append(f"Clip {clip_idx}: {len(punches)} punches")
        for i, p in enumerate(punches, 1):
            ptype = p.get("type", "unknown")
            side = p.get("side", "?")
            conf = p.get("yolo_confidence")
            conf_str = f"{conf:.1%}" if conf is not None else "n/a"
            start_ms = p.get("start_ms", 0)
            end_ms = p.get("end_ms", 0)
            lines.append(f"  {i}. {ptype} ({side}) {start_ms/1000:.2f}s-{end_ms/1000:.2f}s conf={conf_str}")
    return "\n".join(lines) if lines else "(no punch data)"


def fetch_round_score(
    client: OpenAI,
    all_classified_labels: list[dict],
    all_coaching_markdown: list[str],
) -> tuple[dict[str, Any], float]:
    punch_data = format_punch_data_for_scoring(all_classified_labels)
    coaching_notes = "\n\n---\n\n".join(md for md in all_coaching_markdown if md) or "(no coaching notes)"

    prompt = SCORING_PROMPT.format(punch_data=punch_data, coaching_notes=coaching_notes)

    t0 = time.time()
    response = client.chat.completions.create(
        model=SCORING_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are a boxing scoring analyst. Return only valid JSON.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.1,
        max_tokens=256,
    )
    elapsed = time.time() - t0

    raw = (response.choices[0].message.content or "").strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        log.warning("Score model returned invalid JSON: %s", raw[:200])
        result = {"score": 50, "level": "intermediate", "summary": "Could not parse scoring response."}

    score = max(0, min(100, int(result.get("score", 50))))
    level = result.get("level", "intermediate")
    valid_levels = {"beginner", "novice", "intermediate", "advanced", "professional", "world_class"}
    if level not in valid_levels:
        level = "intermediate"

    return {
        "score": score,
        "level": level,
        "summary": result.get("summary", ""),
    }, elapsed
