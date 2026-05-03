# YOLO Eval + Comparison UI

## Goal
Run best YOLO model on frames extracted from test clips, compare predictions against hand-labeled ground truth, show results side-by-side on FE.

---

## Backend

### `backend/run_model.py` (standalone CLI script)
- Finds best.pt from `training_runs/punch_detector/weights/best.pt`
- For each clip (0, 1, 2):
  - Loads `nemotron/labels/clip_{i}_labels.json`
  - Opens `nemotron/mock_inputs/clip_{i}.mp4` with opencv
  - For each punch window: extracts 3 frames (start, midpoint, end)
  - Runs YOLO inference on each frame
  - Saves frames as JPGs to `backend/eval_output/frames/`
  - Writes `backend/eval_output/results.json`

### New Flask routes in `app.py`
- `GET /api/eval/results` → returns results.json
- `GET /api/eval/frame/<path>` → serves frame JPG from eval_output/frames/

### Results JSON shape
```json
{
  "clips": [
    {
      "clip_index": 0,
      "punches": [
        {
          "ground_truth": "cross",
          "start_ms": 2188,
          "end_ms": 2649,
          "frames": [
            {
              "timestamp_ms": 2188,
              "filename": "clip_0_punch_0_start.jpg",
              "yolo_predictions": [
                { "class": "cross", "confidence": 0.87, "bbox": [x,y,w,h] }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Frontend: `/eval` page (add to Dev dropdown)

- Fetch `/api/eval/results`
- Top: summary bar — overall accuracy %, per-class accuracy
- Body: punch cards in a grid, each card shows:
  - 3 frame thumbnails (served via `/api/eval/frame/`)
  - YOLO predicted class + confidence badge
  - Ground truth label badge
  - Green check or red X for match/mismatch
- Filter by clip, by match/mismatch

---

## Decisions made
- 3 frames per punch window (start/mid/end) — good coverage, ~40 frames per clip
- Serve frames as static files via Flask (not base64) — keeps JSON small, FE fast
- `run_model.py` is a CLI script you run once, FE just reads the saved results
