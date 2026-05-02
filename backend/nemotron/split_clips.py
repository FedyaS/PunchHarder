import os
import subprocess
import sys

INPUT_PATH = os.path.join(os.path.dirname(__file__), "test1.mp4")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "mock_inputs")
CLIP_DURATION = 10
TOTAL_DURATION = 30

os.makedirs(OUTPUT_DIR, exist_ok=True)

if not os.path.exists(INPUT_PATH):
    print(f"ERROR: {INPUT_PATH} not found")
    sys.exit(1)

num_clips = TOTAL_DURATION // CLIP_DURATION

for i in range(num_clips):
    start = i * CLIP_DURATION
    out = os.path.join(OUTPUT_DIR, f"clip_{i}.mp4")
    subprocess.run([
        "ffmpeg", "-y",
        "-ss", str(start),
        "-i", INPUT_PATH,
        "-t", str(CLIP_DURATION),
        "-c:v", "libx264",
        "-preset", "fast",
        "-an",
        out,
    ], check=True, capture_output=True)
    size_kb = os.path.getsize(out) / 1024
    print(f"clip_{i}.mp4 ({start}s-{start + CLIP_DURATION}s) — {size_kb:.0f} KB")

print("Done.")
