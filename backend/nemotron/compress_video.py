import os
import sys
import subprocess

INPUT_PATH = os.path.join(os.path.dirname(__file__), "test1.mp4")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "test1_compressed.mp4")

TARGET_MB = 8
RESOLUTION = "480"


def get_duration(path: str) -> float:
    result = subprocess.run(
        ["ffmpeg", "-i", path],
        capture_output=True, text=True,
    )
    for line in result.stderr.split("\n"):
        if "Duration:" in line:
            ts = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = ts.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    raise RuntimeError(f"Could not get duration from {path}")


def compress(input_path: str, output_path: str, target_mb: float, resolution: str):
    duration = get_duration(input_path)
    target_bitrate_kbps = int((target_mb * 8192) / duration)
    input_size_mb = os.path.getsize(input_path) / (1024 * 1024)

    print(f"Input:      {input_path} ({input_size_mb:.1f} MB, {duration:.1f}s)")
    print(f"Target:     {target_mb} MB, {resolution}p, ~{target_bitrate_kbps} kbps")
    print(f"Compressing...")

    subprocess.run([
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", f"scale=-2:{resolution}",
        "-c:v", "libx264",
        "-b:v", f"{target_bitrate_kbps}k",
        "-pass", "1",
        "-an",
        "-f", "null", os.devnull,
    ], check=True, capture_output=True)

    subprocess.run([
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", f"scale=-2:{resolution}",
        "-c:v", "libx264",
        "-b:v", f"{target_bitrate_kbps}k",
        "-pass", "2",
        "-an",
        output_path,
    ], check=True, capture_output=True)

    for f in ["ffmpeg2pass-0.log", "ffmpeg2pass-0.log.mbtree"]:
        if os.path.exists(f):
            os.remove(f)

    output_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    ratio = (1 - output_size_mb / input_size_mb) * 100
    print(f"Output:     {output_path} ({output_size_mb:.1f} MB)")
    print(f"Compressed: {ratio:.0f}% smaller")


if __name__ == "__main__":
    if not os.path.exists(INPUT_PATH):
        print(f"ERROR: {INPUT_PATH} not found")
        sys.exit(1)
    compress(INPUT_PATH, OUTPUT_PATH, TARGET_MB, RESOLUTION)
