import os
import json
import glob

from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

NEMOTRON_OUTPUTS = os.path.join(os.path.dirname(__file__), "nemotron", "outputs")


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


if __name__ == "__main__":
    app.run(debug=True, port=4000)
