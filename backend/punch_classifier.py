from __future__ import annotations

from collections import Counter, defaultdict
from copy import deepcopy
from pathlib import Path
from typing import Any

import cv2
from ultralytics import YOLO


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WEIGHTS = REPO_ROOT / "training_runs" / "punch_detector" / "weights" / "best.pt"
IGNORED_CLASSES = {"bag", "no punch", "no_punch"}

_MODEL_CACHE: dict[Path, YOLO] = {}


def load_model(weights_path: str | Path = DEFAULT_WEIGHTS) -> YOLO:
    weights = Path(weights_path)
    if not weights.exists():
        raise FileNotFoundError(f"YOLO weights not found at {weights}")

    if weights not in _MODEL_CACHE:
        _MODEL_CACHE[weights] = YOLO(str(weights))
    return _MODEL_CACHE[weights]


def extract_all_frames_in_window(video_path: Path, start_ms: int, end_ms: int) -> list[tuple[int, Any]]:
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


def run_inference(model: YOLO, frame: Any, conf_threshold: float = 0.25) -> list[dict[str, Any]]:
    results = model(frame, verbose=False, conf=conf_threshold)
    predictions = []
    for result in results:
        for box in result.boxes:
            predictions.append({
                "class": result.names[int(box.cls[0])],
                "confidence": round(float(box.conf[0]), 3),
                "bbox": [round(float(x), 1) for x in box.xyxy[0].tolist()],
            })
    return predictions


def pick_best_prediction(predictions: list[dict[str, Any]]) -> dict[str, Any]:
    best = {"class": "", "confidence": 0}
    for pred in predictions:
        pred_class = pred.get("class", "")
        if pred_class.lower() in IGNORED_CLASSES:
            continue
        if pred.get("confidence", 0) > best["confidence"]:
            best = pred
    return best


def _classify_frames(frame_predictions: list[dict[str, Any]]) -> dict[str, Any]:
    votes = Counter()
    confidence_sums = defaultdict(float)
    best_confidences = defaultdict(float)

    for frame_result in frame_predictions:
        best = pick_best_prediction(frame_result["yolo_predictions"])
        pred_class = best.get("class", "")
        if not pred_class:
            continue

        confidence = float(best.get("confidence", 0))
        votes[pred_class] += 1
        confidence_sums[pred_class] += confidence
        best_confidences[pred_class] = max(best_confidences[pred_class], confidence)

    if not votes:
        return {
            "type": "",
            "confidence": 0,
            "prediction_counts": {},
        }

    winner = max(
        votes,
        key=lambda cls: (
            votes[cls],
            confidence_sums[cls] / votes[cls],
            best_confidences[cls],
        ),
    )

    return {
        "type": winner,
        "confidence": round(confidence_sums[winner] / votes[winner], 3),
        "prediction_counts": dict(votes),
    }


def classify_punch_windows(
    video_path: str | Path,
    labels: dict[str, Any],
    *,
    model: YOLO | None = None,
    weights_path: str | Path = DEFAULT_WEIGHTS,
    conf_threshold: float = 0.25,
) -> dict[str, Any]:
    video_path = Path(video_path)
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found at {video_path}")

    model = model or load_model(weights_path)
    classified = deepcopy(labels)

    for punch in classified.get("punches", []):
        start_ms = int(punch["start_ms"])
        end_ms = int(punch["end_ms"])
        frames = extract_all_frames_in_window(video_path, start_ms, end_ms)

        frame_predictions = []
        for timestamp_ms, frame in frames:
            frame_predictions.append({
                "timestamp_ms": timestamp_ms,
                "yolo_predictions": run_inference(model, frame, conf_threshold),
            })

        classification = _classify_frames(frame_predictions)
        if classification["type"]:
            punch["type"] = classification["type"]
            punch["yolo_confidence"] = classification["confidence"]

        punch["num_frames_analyzed"] = len(frames)
        punch["prediction_counts"] = classification["prediction_counts"]

    return classified
