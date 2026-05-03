"""
Session pipeline: webm→mp4, YOLO classification, Nemotron coaching, TTS.

Orchestrates the full backend flow for a single session clip.
Supports MOCK_API=1 to cache and replay AI responses without hitting NVIDIA.
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
import time
from pathlib import Path
from typing import Any, Optional

import imageio_ffmpeg
from openai import OpenAI

from coaching_parser import parse_coaching_markdown
from punch_classifier import classify_punch_windows

log = logging.getLogger(__name__)

_backend_dir = Path(__file__).resolve().parent
MOCK_CACHE_DIR = _backend_dir / "mock_cache"

MOCK_COACHING_FALLBACK = """## General form notes

Keep your guard up between combinations. Focus on returning your hands to your chin after each punch. Stay light on your feet and maintain your stance throughout.
"""


def is_mock_mode() -> bool:
    return os.environ.get("MOCK_API", "").strip() in ("1", "true", "yes")


def _mock_cache_path(clip_index: int, kind: str) -> Path:
    """Path inside mock_cache for a given clip index and artifact kind."""
    return MOCK_CACHE_DIR / f"clip_{clip_index}" / kind


def _save_to_mock_cache(clip_index: int, coaching_md: str, tts_wavs: dict[int, bytes]):
    cache_dir = MOCK_CACHE_DIR / f"clip_{clip_index}"
    os.makedirs(cache_dir, exist_ok=True)
    with open(cache_dir / "coaching.md", "w", encoding="utf-8") as f:
        f.write(coaching_md)
    for section_idx, wav_bytes in tts_wavs.items():
        with open(cache_dir / f"tts_section_{section_idx}.wav", "wb") as f:
            f.write(wav_bytes)
    log.info("Mock cache saved for clip %d → %s", clip_index, cache_dir)


def _load_coaching_from_cache(clip_index: int) -> Optional[str]:
    path = _mock_cache_path(clip_index, "coaching.md")
    if path.is_file():
        return path.read_text(encoding="utf-8")
    for candidate in sorted(MOCK_CACHE_DIR.glob("clip_*/coaching.md")):
        return candidate.read_text(encoding="utf-8")
    return None


def _load_tts_from_cache(clip_index: int, section_idx: int) -> Optional[bytes]:
    path = _mock_cache_path(clip_index, f"tts_section_{section_idx}.wav")
    if path.is_file():
        return path.read_bytes()
    for candidate in sorted(MOCK_CACHE_DIR.glob(f"clip_*/tts_section_{section_idx}.wav")):
        return candidate.read_bytes()
    return None


def convert_webm_to_mp4(input_path: str | Path, output_path: str | Path) -> Path:
    """Convert a webm file to mp4 via ffmpeg (bundled by imageio-ffmpeg)."""
    input_path = Path(input_path)
    output_path = Path(output_path)
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg, "-y",
        "-i", str(input_path),
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "23",
        "-an",
        str(output_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed (rc={result.returncode}): {result.stderr[:500]}")
    if not output_path.exists():
        raise RuntimeError(f"ffmpeg produced no output at {output_path}")
    return output_path


def _get_nemotron_client() -> OpenAI:
    api_key = os.environ.get("NVIDIA_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("NVIDIA_API_KEY not set")
    return OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key,
        timeout=120,
    )


def process_session_clip(
    session_dir: str | Path,
    clip_index: int,
    webm_path: str | Path,
    labels: dict[str, Any],
) -> dict[str, Any]:
    session_dir = Path(session_dir)
    webm_path = Path(webm_path)
    clips_dir = session_dir / "clips"
    labels_dir = session_dir / "labels"
    tts_dir = session_dir / "tts"
    os.makedirs(clips_dir, exist_ok=True)
    os.makedirs(labels_dir, exist_ok=True)
    os.makedirs(tts_dir, exist_ok=True)

    mock = is_mock_mode()
    timings: dict[str, float] = {}

    # 1. ffmpeg conversion
    t0 = time.time()
    mp4_path = clips_dir / f"clip_{clip_index}.mp4"
    convert_webm_to_mp4(webm_path, mp4_path)
    timings["ffmpeg_s"] = round(time.time() - t0, 2)
    log.info("Clip %d: converted to mp4 (%.2fs)", clip_index, timings["ffmpeg_s"])

    # 2. YOLO classification (always runs — local model)
    t0 = time.time()
    classified_labels = classify_punch_windows(str(mp4_path), labels)
    timings["yolo_s"] = round(time.time() - t0, 2)
    classified_path = labels_dir / f"clip_{clip_index}_labels.json"
    with open(classified_path, "w", encoding="utf-8") as f:
        json.dump(classified_labels, f, indent=2)
    log.info("Clip %d: classified %d punches (%.2fs)", clip_index, len(classified_labels.get("punches", [])), timings["yolo_s"])

    # 3. Nemotron coaching (mock or real)
    t0 = time.time()
    tokens = {}
    if mock:
        coaching_markdown = _load_coaching_from_cache(clip_index) or MOCK_COACHING_FALLBACK
        log.info("Clip %d: MOCK MODE — using cached coaching", clip_index)
    else:
        from nemotron.generate_coaching_tips import fetch_coaching
        client = _get_nemotron_client()
        coaching_markdown, tokens, elapsed_s = fetch_coaching(
            client, clip_index, str(mp4_path), classified_labels,
        )
    timings["nemotron_s"] = round(time.time() - t0, 2)
    log.info("Clip %d: coaching in %.1fs (%d tokens)", clip_index, timings["nemotron_s"], tokens.get("total_tokens", 0))

    coaching_path = session_dir / f"clip_{clip_index}_coaching.md"
    with open(coaching_path, "w", encoding="utf-8") as f:
        f.write(coaching_markdown)

    # 4. Parse coaching markdown
    sections = parse_coaching_markdown(coaching_markdown, clip_index=clip_index)

    # 5. TTS per section (mock or real, non-fatal)
    t0 = time.time()
    api_key = os.environ.get("NVIDIA_API_KEY", "").strip()
    tts_available = False
    if not mock:
        try:
            from nemotron.magpie_tts import synthesize_speech_wav_bytes, tts_backend_ready
            ok, reason = tts_backend_ready()
            tts_available = ok
            if not ok:
                log.warning("TTS not ready: %s", reason)
        except ImportError:
            log.warning("TTS import failed — skipping audio synthesis")

    tts_wavs_for_cache: dict[int, bytes] = {}
    coaching_sections = []
    for section_idx, section in enumerate(sections):
        tts_url: Optional[str] = None
        session_id = session_dir.name

        if mock:
            cached_wav = _load_tts_from_cache(clip_index, section_idx)
            if cached_wav:
                wav_filename = f"clip_{clip_index}_section_{section_idx}.wav"
                wav_path = tts_dir / wav_filename
                with open(wav_path, "wb") as f:
                    f.write(cached_wav)
                tts_url = f"/api/live/session/{session_id}/tts/{clip_index}/{section_idx}"
        elif tts_available and section["body"]:
            try:
                wav_bytes = synthesize_speech_wav_bytes(section["body"], api_key)
                wav_filename = f"clip_{clip_index}_section_{section_idx}.wav"
                wav_path = tts_dir / wav_filename
                with open(wav_path, "wb") as f:
                    f.write(wav_bytes)
                tts_url = f"/api/live/session/{session_id}/tts/{clip_index}/{section_idx}"
                tts_wavs_for_cache[section_idx] = wav_bytes
                log.info("Clip %d section %d: TTS saved (%d bytes)", clip_index, section_idx, len(wav_bytes))
            except Exception:
                log.warning("Clip %d section %d: TTS failed, skipping audio", clip_index, section_idx, exc_info=True)

        coaching_sections.append({
            "heading": section["heading"],
            "start_s": section["start_s"],
            "end_s": section["end_s"],
            "body": section["body"],
            "clip_index": section["clip_index"],
            "tts_url": tts_url,
        })

    timings["tts_s"] = round(time.time() - t0, 2)

    # Save to mock cache for future runs (only when using real API)
    if not mock and coaching_markdown:
        try:
            _save_to_mock_cache(clip_index, coaching_markdown, tts_wavs_for_cache)
        except Exception:
            log.warning("Failed to save mock cache for clip %d", clip_index, exc_info=True)

    return {
        "classified_labels": classified_labels,
        "coaching_sections": coaching_sections,
        "coaching_raw_markdown": coaching_markdown,
        "timings": timings,
        "mock_mode": mock,
    }
