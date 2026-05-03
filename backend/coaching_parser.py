"""Parse Nemotron coaching markdown into structured sections with timestamps."""

from __future__ import annotations

import re
from typing import Optional

HEADING_RE = re.compile(
    r"^(#{1,3})\s+(.*?)$", re.MULTILINE
)
TIMESTAMP_RE = re.compile(
    r"@(\d+\.?\d*)s-(\d+\.?\d*)s"
)


def parse_coaching_markdown(
    raw_markdown: str,
    clip_index: int = 0,
) -> list[dict]:
    """
    Split coaching markdown into a list of structured sections.

    Returns list of dicts:
      {
        "heading": str,
        "start_s": float | None,
        "end_s": float | None,
        "body": str,
        "clip_index": int,
      }
    """
    sections: list[dict] = []
    heading_spans: list[tuple[int, str, int]] = []

    for m in HEADING_RE.finditer(raw_markdown):
        heading_spans.append((m.start(), m.group(2).strip(), m.end()))

    if not heading_spans:
        body = raw_markdown.strip()
        if body:
            sections.append({
                "heading": "General coaching",
                "start_s": None,
                "end_s": None,
                "body": body,
                "clip_index": clip_index,
            })
        return sections

    for i, (start, heading_text, heading_end) in enumerate(heading_spans):
        if i + 1 < len(heading_spans):
            body_text = raw_markdown[heading_end:heading_spans[i + 1][0]]
        else:
            body_text = raw_markdown[heading_end:]

        body_text = body_text.strip()

        ts_match = TIMESTAMP_RE.search(heading_text)
        start_s: Optional[float] = None
        end_s: Optional[float] = None
        if ts_match:
            start_s = float(ts_match.group(1))
            end_s = float(ts_match.group(2))
            clean_heading = heading_text[:ts_match.start()] + heading_text[ts_match.end():]
            clean_heading = re.sub(r"\s*[—–-]\s*$", "", clean_heading).strip()
        else:
            clean_heading = heading_text

        sections.append({
            "heading": clean_heading,
            "start_s": start_s,
            "end_s": end_s,
            "body": body_text,
            "clip_index": clip_index,
        })

    return sections
