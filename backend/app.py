import os
import json
import glob

from flask import Flask, jsonify, request, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

NEMOTRON_OUTPUTS = os.path.join(os.path.dirname(__file__), "nemotron", "outputs")
MOCK_INPUTS = os.path.join(os.path.dirname(__file__), "nemotron", "mock_inputs")


@app.route("/api/ping")
def ping():
    return {"message": "pong from flask"}


@app.route("/api/analysis/runs")
def analysis_runs():
    pattern = os.path.join(NEMOTRON_OUTPUTS, "**", "combined_*.json")
    files = sorted(glob.glob(pattern, recursive=True))
    runs = []
    for f in files:
        run_dir = os.path.basename(os.path.dirname(f))
        with open(f, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        runs.append({
            "run_id": run_dir,
            "generated_at": data.get("generated_at", ""),
            "total_punches": data.get("punch_summary", {}).get("total", 0),
            "num_clips": data.get("num_clips", 0),
        })
    if not files:
        combined_root = glob.glob(os.path.join(NEMOTRON_OUTPUTS, "combined_*.json"))
        for f in sorted(combined_root):
            with open(f, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            runs.append({
                "run_id": "default",
                "generated_at": data.get("generated_at", ""),
                "total_punches": data.get("punch_summary", {}).get("total", 0),
                "num_clips": data.get("num_clips", 0),
            })
    return jsonify(runs)


@app.route("/api/analysis/<run_id>")
def analysis_by_run(run_id):
    if run_id == "default":
        pattern = os.path.join(NEMOTRON_OUTPUTS, "combined_*.json")
    else:
        pattern = os.path.join(NEMOTRON_OUTPUTS, run_id, "combined_*.json")
    files = sorted(glob.glob(pattern))
    if not files:
        return jsonify({"error": "run not found"}), 404
    with open(files[-1], "r", encoding="utf-8") as f:
        return jsonify(json.load(f))


@app.route("/api/replay/clips")
def replay_clips():
    clips = []
    for i in range(3):
        json_path = os.path.join(MOCK_INPUTS, f"clip_{i}.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                clips.append(json.load(f))
    return jsonify(clips)


LABELS_DIR = os.path.join(os.path.dirname(__file__), "nemotron", "labels")
os.makedirs(LABELS_DIR, exist_ok=True)


@app.route("/api/label/save", methods=["POST"])
def save_labels():
    data = request.get_json()
    clip_index = data.get("clip_index", 0)
    out_path = os.path.join(LABELS_DIR, f"clip_{clip_index}_labels.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return jsonify({"status": "ok", "path": out_path})


@app.route("/api/replay/video/<int:clip_index>")
def replay_video(clip_index):
    video_path = os.path.join(MOCK_INPUTS, f"clip_{clip_index}.mp4")
    if not os.path.exists(video_path):
        return jsonify({"error": "clip not found"}), 404

    file_size = os.path.getsize(video_path)
    range_header = request.headers.get("Range")

    if range_header:
        byte_start = int(range_header.replace("bytes=", "").split("-")[0])
        byte_end = file_size - 1
        length = byte_end - byte_start + 1

        with open(video_path, "rb") as f:
            f.seek(byte_start)
            data = f.read(length)

        resp = Response(data, 206, mimetype="video/mp4")
        resp.headers["Content-Range"] = f"bytes {byte_start}-{byte_end}/{file_size}"
        resp.headers["Accept-Ranges"] = "bytes"
        resp.headers["Content-Length"] = str(length)
        return resp

    with open(video_path, "rb") as f:
        data = f.read()
    resp = Response(data, 200, mimetype="video/mp4")
    resp.headers["Accept-Ranges"] = "bytes"
    resp.headers["Content-Length"] = str(file_size)
    return resp


if __name__ == "__main__":
    app.run(debug=True, port=4000)
