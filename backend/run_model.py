"""
Run the trained YOLO punch detector on frames extracted from labeled clips.

Usage:
    python run_model.py
    python run_model.py --weights path/to/best.pt
    python run_model.py --clips 0 1
"""

import argparse
import json
import os
import sys
from pathlib import Path

import cv2
from ultralytics import YOLO

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WEIGHTS = REPO_ROOT / "training_runs" / "punch_detector" / "weights" / "best.pt"
CLIPS_DIR = Path(__file__).resolve().parent / "nemotron" / "mock_inputs"
LABELS_DIR = Path(__file__).resolve().parent / "nemotron" / "labels"
OUTPUT_DIR = Path(__file__).resolve().parent / "eval_output"
FRAMES_DIR = OUTPUT_DIR / "frames"


def extract_frames(video_path: Path, timestamps_ms: list[int]) -> dict[int, any]:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"ERROR: cannot open {video_path}")
        return {}

    frames = {}
    for ts in sorted(timestamps_ms):
        cap.set(cv2.CAP_PROP_POS_MSEC, ts)
        ok, frame = cap.read()
        if ok:
            frames[ts] = frame
    cap.release()
    return frames


def extract_all_frames_in_window(video_path: Path, start_ms: int, end_ms: int) -> list[tuple[int, any]]:
    """Extract every frame between start_ms and end_ms at native FPS."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return []

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_interval_ms = 1000.0 / fps

    cap.set(cv2.CAP_PROP_POS_MSEC, start_ms)
    frames = []
    while True:
        pos_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
        if pos_ms > end_ms:
            break
        ok, frame = cap.read()
        if not ok:
            break
        frames.append((int(pos_ms), frame))
    cap.release()

    # For very short punches that yielded 0-1 frames, also grab the midpoint
    if len(frames) < 2:
        cap = cv2.VideoCapture(str(video_path))
        mid = (start_ms + end_ms) // 2
        for ts in [start_ms, mid, end_ms]:
            cap.set(cv2.CAP_PROP_POS_MSEC, ts)
            ok, frame = cap.read()
            if ok and not any(abs(f[0] - ts) < frame_interval_ms for f in frames):
                frames.append((ts, frame))
        cap.release()

    return sorted(frames, key=lambda x: x[0])


def run_inference(model: YOLO, frame, conf_threshold: float = 0.25):
    results = model(frame, verbose=False, conf=conf_threshold)
    predictions = []
    for r in results:
        for box in r.boxes:
            predictions.append({
                "class": r.names[int(box.cls[0])],
                "confidence": round(float(box.conf[0]), 3),
                "bbox": [round(float(x), 1) for x in box.xyxy[0].tolist()],
            })
    return predictions


def process_clip(model: YOLO, clip_index: int, conf_threshold: float) -> dict | None:
    video_path = CLIPS_DIR / f"clip_{clip_index}.mp4"
    labels_path = LABELS_DIR / f"clip_{clip_index}_labels.json"

    if not video_path.exists():
        print(f"  SKIP: {video_path} not found")
        return None
    if not labels_path.exists():
        print(f"  SKIP: {labels_path} not found")
        return None

    with open(labels_path, "r", encoding="utf-8") as f:
        labels = json.load(f)

    punch_results = []
    for pi, punch in enumerate(labels.get("punches", [])):
        start = punch["start_ms"]
        end = punch["end_ms"]
        duration = end - start

        all_frames = extract_all_frames_in_window(video_path, start, end)
        print(f"    punch {pi}: {start}-{end}ms ({duration}ms) → {len(all_frames)} frames")

        # Run inference on every frame, track which has best punch detection
        scored_frames = []
        for ts, frame in all_frames:
            preds = run_inference(model, frame, conf_threshold)
            best_in_frame = _pick_best_prediction([{"yolo_predictions": preds}])
            scored_frames.append({
                "timestamp_ms": ts,
                "frame": frame,
                "yolo_predictions": preds,
                "best_conf": best_in_frame.get("confidence", 0),
                "best_class": best_in_frame.get("class", ""),
            })

        # Sort by best detection confidence, pick top frame + neighbors for display
        scored_frames.sort(key=lambda x: x["best_conf"], reverse=True)

        # The overall best prediction for this punch window
        if scored_frames and scored_frames[0]["best_conf"] > 0:
            best_pred = {"class": scored_frames[0]["best_class"], "confidence": scored_frames[0]["best_conf"]}
        else:
            best_pred = {"class": "", "confidence": 0}

        by_time = sorted(scored_frames, key=lambda x: x["timestamp_ms"])

        frame_results = []
        for sf in by_time:
            filename = f"clip_{clip_index}_punch_{pi}_{sf['timestamp_ms']}ms.jpg"
            cv2.imwrite(str(FRAMES_DIR / filename), sf["frame"])
            frame_results.append({
                "timestamp_ms": sf["timestamp_ms"],
                "filename": filename,
                "yolo_predictions": sf["yolo_predictions"],
            })

        punch_results.append({
            "punch_index": pi,
            "ground_truth": punch.get("type", ""),
            "start_ms": start,
            "end_ms": end,
            "num_frames_analyzed": len(all_frames),
            "predicted_class": best_pred.get("class", ""),
            "predicted_confidence": best_pred.get("confidence", 0),
            "match": best_pred.get("class", "").lower() == punch.get("type", "").lower(),
            "frames": frame_results,
        })

    return {
        "clip_index": clip_index,
        "clip_start_ms": labels.get("clip_start_ms", 0),
        "clip_end_ms": labels.get("clip_end_ms", 0),
        "num_punches": len(punch_results),
        "punches": punch_results,
    }



def _pick_best_prediction(frame_results: list[dict]) -> dict:
    """Pick the highest-confidence punch prediction across all frames."""
    best = {"class": "", "confidence": 0}
    ignore_classes = {"bag", "no punch", "no_punch"}
    for fr in frame_results:
        for pred in fr.get("yolo_predictions", []):
            if pred["class"].lower() in ignore_classes:
                continue
            if pred["confidence"] > best["confidence"]:
                best = pred
    return best


def main():
    parser = argparse.ArgumentParser(description="Run YOLO eval on labeled clips")
    parser.add_argument("--weights", type=str, default=str(DEFAULT_WEIGHTS))
    parser.add_argument("--clips", type=int, nargs="+", default=[0, 1, 2])
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    args = parser.parse_args()

    weights = Path(args.weights)
    if not weights.exists():
        print(f"ERROR: weights not found at {weights}")
        sys.exit(1)

    FRAMES_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Loading model: {weights}")
    model = YOLO(str(weights))

    all_clips = []
    total_punches = 0
    total_matches = 0

    for ci in args.clips:
        print(f"\nProcessing clip {ci}...")
        result = process_clip(model, ci, args.conf)
        if result is None:
            continue
        all_clips.append(result)
        for p in result["punches"]:
            total_punches += 1
            if p["match"]:
                total_matches += 1

    accuracy = (total_matches / total_punches * 100) if total_punches else 0

    output = {
        "weights": str(weights),
        "conf_threshold": args.conf,
        "total_punches": total_punches,
        "total_matches": total_matches,
        "accuracy_pct": round(accuracy, 1),
        "clips": all_clips,
    }

    results_path = OUTPUT_DIR / "results.json"
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"\n{'='*50}")
    print(f"Results: {total_matches}/{total_punches} correct ({accuracy:.1f}%)")
    print(f"Saved to: {results_path}")
    print(f"Frames:  {FRAMES_DIR}")


if __name__ == "__main__":
    main()
