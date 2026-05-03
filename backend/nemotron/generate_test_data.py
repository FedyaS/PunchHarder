import os
import sys
import json
import time
import base64
import subprocess
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

RUN_NAME = datetime.now().strftime("%Y%m%d_%H%M%S")
OUTPUTS_DIR = os.path.join(os.path.dirname(__file__), "outputs", f"run_{RUN_NAME}")
os.makedirs(OUTPUTS_DIR, exist_ok=True)

VIDEO_PATH = os.path.join(os.path.dirname(__file__), "test1.mp4")
CLIP_DURATION_S = 10
TOTAL_DURATION_S = 30
MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"

APPROX_PUNCH_COUNTS = {
    0: 14,
    1: 15,
    2: 8,
}

CLIP_ANALYSIS_PROMPT_TEMPLATE = """You are an expert boxing analyst. Watch this 10-second clip of shadowboxing.

There are approximately {approx_count} punches in this clip. Identify each one carefully — look at every frame.

Return ONLY valid JSON (no markdown, no code fences). Keep your reasoning minimal.
Use this exact structure:
{{
  "punches": [
    {{
      "type": "jab|cross|hook|uppercut",
      "confidence": 0.0-1.0,
      "estimated_velocity": 0.0-100.0,
      "estimated_power": 0.0-100.0,
      "timestamp_ms": 0
    }}
  ],
  "form_notes": {{
    "guard_discipline": 0.0-1.0,
    "rhythm_consistency": 0.0-1.0,
    "observations": "brief text"
  }}
}}

Timestamps should be relative to the start of THIS clip (0 to 10000ms).
Be precise about punch types. Estimate velocity/power on a 0-100 scale."""


def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


def split_video(input_path: str, clip_duration: int, total_duration: int) -> list[str]:
    clip_paths = []
    num_clips = total_duration // clip_duration

    for i in range(num_clips):
        start = i * clip_duration
        clip_name = f"clip_{i}_{start}s-{start + clip_duration}s.mp4"
        clip_path = os.path.join(OUTPUTS_DIR, clip_name)

        subprocess.run([
            "ffmpeg", "-y",
            "-i", input_path,
            "-ss", str(start),
            "-t", str(clip_duration),
            "-c", "copy",
            clip_path,
        ], check=True, capture_output=True)

        file_size_kb = os.path.getsize(clip_path) / 1024
        clip_paths.append(clip_path)
        log(f"  Split clip {i}: {clip_name} ({file_size_kb:.0f} KB)")

    return clip_paths


def video_to_base64(path: str) -> str:
    with open(path, "rb") as f:
        return f"data:video/mp4;base64,{base64.b64encode(f.read()).decode('utf-8')}"


def analyze_clip(client: OpenAI, clip_path: str, clip_index: int, clip_start_s: int) -> dict:
    num_clips = TOTAL_DURATION_S // CLIP_DURATION_S
    approx_count = APPROX_PUNCH_COUNTS.get(clip_index, 10)
    prompt = CLIP_ANALYSIS_PROMPT_TEMPLATE.format(approx_count=approx_count)

    log(f"Sending clip {clip_index + 1}/{num_clips} ({clip_start_s}s-{clip_start_s + CLIP_DURATION_S}s, ~{approx_count} punches)...")

    video_b64 = video_to_base64(clip_path)
    b64_size_kb = len(video_b64) / 1024
    log(f"  Payload size: {b64_size_kb:.0f} KB (base64)")
    log(f"  Waiting for Nemotron...")

    t_start = time.time()

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You are a boxing form analyst. Return ONLY valid JSON. No explanations, no markdown, no extra text."},
            {"role": "user", "content": [
                {"type": "text", "text": prompt},
                {"type": "video_url", "video_url": {"url": video_b64}},
            ]},
        ],
        temperature=0.2,
        max_tokens=4096,
        extra_body={
            "chat_template_kwargs": {"enable_thinking": False},
            "top_k": 1,
        },
    )

    elapsed_s = time.time() - t_start
    log(f"  Response received in {elapsed_s:.1f}s")

    raw = response.model_dump_json(indent=2)
    raw_path = os.path.join(OUTPUTS_DIR, f"clip_{clip_index}_raw_response.json")
    with open(raw_path, "w", encoding="utf-8") as f:
        f.write(raw)
    log(f"  Raw response saved: {raw_path}")

    usage = response.usage
    tokens = {
        "prompt_tokens": usage.prompt_tokens if usage else 0,
        "completion_tokens": usage.completion_tokens if usage else 0,
        "total_tokens": usage.total_tokens if usage else 0,
    }
    log(f"  Tokens — prompt: {tokens['prompt_tokens']}, completion: {tokens['completion_tokens']}, total: {tokens['total_tokens']}")

    content = response.choices[0].message.content or ""
    reasoning = getattr(response.choices[0].message, "reasoning_content", None)

    text_path = os.path.join(OUTPUTS_DIR, f"clip_{clip_index}_output.txt")
    with open(text_path, "w", encoding="utf-8") as f:
        if reasoning:
            f.write("=== REASONING ===\n" + reasoning + "\n\n")
        f.write("=== RESPONSE ===\n" + content)

    try:
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]
        punch_data = json.loads(cleaned)
    except json.JSONDecodeError:
        log(f"  WARN: Could not parse JSON from response, saving raw text")
        punch_data = {"raw_text": content, "parse_error": True}

    num_punches = len(punch_data.get("punches", []))
    log(f"  Detected {num_punches} punches in clip")

    for p in punch_data.get("punches", []):
        p["timestamp_ms"] += clip_start_s * 1000

    return {
        "clip_index": clip_index,
        "clip_start_ms": clip_start_s * 1000,
        "clip_end_ms": (clip_start_s + CLIP_DURATION_S) * 1000,
        "analysis": punch_data,
        "tokens": tokens,
        "response_time_s": round(elapsed_s, 1),
    }


def main():
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        log("ERROR: NVIDIA_API_KEY not set. Add it to .env or export it.")
        sys.exit(1)

    if not os.path.exists(VIDEO_PATH):
        log(f"ERROR: {VIDEO_PATH} not found. Record a 30s shadowboxing clip and save it there.")
        sys.exit(1)

    client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=api_key)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    session_start = time.time()

    log("=== PunchHarder Test Data Generator ===")
    log(f"Video: {VIDEO_PATH}")
    log(f"Model: {MODEL}")
    log(f"Clip duration: {CLIP_DURATION_S}s, Total: {TOTAL_DURATION_S}s")
    log("")
    log("Splitting video into clips...")

    clip_paths = split_video(VIDEO_PATH, CLIP_DURATION_S, TOTAL_DURATION_S)
    log("")

    clip_results = []
    total_tokens = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}

    for i, clip_path in enumerate(clip_paths):
        result = analyze_clip(client, clip_path, i, i * CLIP_DURATION_S)
        clip_results.append(result)
        for k in total_tokens:
            total_tokens[k] += result["tokens"][k]
        log("")

    all_punches = []
    for r in clip_results:
        all_punches.extend(r["analysis"].get("punches", []))

    combined = {
        "generated_at": timestamp,
        "video_source": "test1.mp4",
        "total_duration_ms": TOTAL_DURATION_S * 1000,
        "clip_duration_ms": CLIP_DURATION_S * 1000,
        "num_clips": len(clip_results),
        "total_tokens": total_tokens,
        "total_response_time_s": round(sum(r["response_time_s"] for r in clip_results), 1),
        "clips": clip_results,
        "all_punches_combined": all_punches,
        "punch_summary": {
            "total": len(all_punches),
            "by_type": {},
        },
    }

    for p in all_punches:
        t = p.get("type", "unknown")
        if t not in combined["punch_summary"]["by_type"]:
            combined["punch_summary"]["by_type"][t] = {
                "count": 0, "velocities": [], "powers": [],
            }
        entry = combined["punch_summary"]["by_type"][t]
        entry["count"] += 1
        entry["velocities"].append(p.get("estimated_velocity", 0))
        entry["powers"].append(p.get("estimated_power", 0))

    for t, entry in combined["punch_summary"]["by_type"].items():
        vels = entry["velocities"]
        pows = entry["powers"]
        entry["avg_velocity"] = round(sum(vels) / len(vels), 1) if vels else 0
        entry["max_velocity"] = round(max(vels), 1) if vels else 0
        entry["avg_power"] = round(sum(pows) / len(pows), 1) if pows else 0
        entry["max_power"] = round(max(pows), 1) if pows else 0

    combined_path = os.path.join(OUTPUTS_DIR, f"combined_{timestamp}.json")
    with open(combined_path, "w", encoding="utf-8") as f:
        json.dump(combined, f, indent=2)

    session_elapsed = time.time() - session_start

    log("=== SUMMARY ===")
    log(f"Total session time: {session_elapsed:.1f}s")
    log(f"API response time: {combined['total_response_time_s']}s")
    log(f"Punches detected: {combined['punch_summary']['total']}")
    log(f"Tokens — prompt: {total_tokens['prompt_tokens']}, completion: {total_tokens['completion_tokens']}, total: {total_tokens['total_tokens']}")
    for t, entry in combined["punch_summary"]["by_type"].items():
        log(f"  {t}: {entry['count']}x, avg_power={entry['avg_power']}, max_power={entry['max_power']}")
    log(f"Combined results saved: {combined_path}")


if __name__ == "__main__":
    main()
