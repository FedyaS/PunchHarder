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
        mid = (start + end) // 2
        timestamps = [start, mid, end]

        frames = extract_frames(video_path, timestamps)

        frame_results = []
        for ts in timestamps:
            frame = frames.get(ts)
            if frame is None:
                continue

            filename = f"clip_{clip_index}_punch_{pi}_{ts}ms.jpg"
            cv2.imwrite(str(FRAMES_DIR / filename), frame)

            preds = run_inference(model, frame, conf_threshold)
            frame_results.append({
                "timestamp_ms": ts,
                "filename": filename,
                "yolo_predictions": preds,
            })

        best_pred = _pick_best_prediction(frame_results)

        punch_results.append({
            "punch_index": pi,
            "ground_truth": punch.get("type", ""),
            "start_ms": start,
            "end_ms": end,
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
