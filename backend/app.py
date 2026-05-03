import os
import json
import glob
from datetime import datetime

from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from werkzeug.utils import secure_filename

from punch_classifier import classify_punch_windows
from pathlib import Path

from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from dotenv import load_dotenv

_backend_dir = Path(__file__).resolve().parent
_repo_root = _backend_dir.parent
load_dotenv(_repo_root / ".env")
load_dotenv(_backend_dir / ".env")

try:
    from nemotron.magpie_tts import synthesize_speech_wav_bytes, tts_backend_ready
except ImportError:  # pragma: no cover
    synthesize_speech_wav_bytes = None

    def tts_backend_ready():
        return False, "magpie_tts_import_failed"

app = Flask(__name__)
CORS(app)

NEMOTRON_OUTPUTS = os.path.join(os.path.dirname(__file__), "nemotron", "outputs")
MOCK_INPUTS = os.path.join(os.path.dirname(__file__), "nemotron", "mock_inputs")
EVAL_OUTPUT = os.path.join(os.path.dirname(__file__), "eval_output")
LIVE_SESSIONS = os.path.join(os.path.dirname(__file__), "live_sessions")


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


def _latest_coaching_run_dir():
    """Most recently modified nemotron/outputs/coaching_* directory."""
    if not os.path.isdir(NEMOTRON_OUTPUTS):
        return None
    candidates = []
    for name in os.listdir(NEMOTRON_OUTPUTS):
        if not name.startswith("coaching_"):
            continue
        path = os.path.join(NEMOTRON_OUTPUTS, name)
        if os.path.isdir(path):
            candidates.append(path)
    if not candidates:
        return None
    return max(candidates, key=os.path.getmtime)


@app.route("/api/replay/clips")
def replay_clips():
    clips = []
    for i in range(3):
        json_path = os.path.join(MOCK_INPUTS, f"clip_{i}.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                clips.append(json.load(f))
    return jsonify(clips)


@app.route("/api/replay/tts/status")
def replay_tts_status():
    """Magpie TTS (Nemotron Voice Agent stack) — same cloud Riva path as build.nvidia.com docs."""
    if synthesize_speech_wav_bytes is None:
        return jsonify({
            "ok": False,
            "reason": "import_failed",
            "provider": "Magpie TTS (Nemotron Voice Agent)",
            "info": "https://build.nvidia.com/nvidia/nemotron-voice-agent",
        })
    ok, reason = tts_backend_ready()
    return jsonify({
        "ok": ok,
        "reason": reason,
        "provider": "Magpie TTS (Nemotron Voice Agent)",
        "info": "https://build.nvidia.com/nvidia/nemotron-voice-agent",
    })


@app.route("/api/replay/tts", methods=["POST"])
def replay_tts():
    """Synthesize coaching text to WAV using Magpie TTS on NVIDIA NVCF."""
    if synthesize_speech_wav_bytes is None:
        return jsonify({"error": "TTS not available (install nvidia-riva-client)"}), 503
    ok, reason = tts_backend_ready()
    if not ok:
        return jsonify({"error": reason}), 503

    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text required"}), 400
    if len(text) > 12000:
        return jsonify({"error": "text too long (max 12000 chars)"}), 400

    api_key = os.environ.get("NVIDIA_API_KEY", "").strip()
    try:
        wav_bytes = synthesize_speech_wav_bytes(text, api_key)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    return Response(wav_bytes, mimetype="audio/wav")


@app.route("/api/replay/coaching/<int:clip_index>")
def replay_coaching(clip_index):
    run_dir = _latest_coaching_run_dir()
    if not run_dir:
        return jsonify({"error": "no coaching run"}), 404
    txt_path = os.path.join(run_dir, f"clip_{clip_index}_coaching.txt")
    if not os.path.isfile(txt_path):
        return jsonify({"error": "no coaching file for clip"}), 404
    with open(txt_path, "r", encoding="utf-8") as f:
        text = f.read()
    return jsonify({
        "clip_index": clip_index,
        "run_dir": os.path.basename(run_dir),
        "text": text,
    })


LABELS_DIR = os.path.join(os.path.dirname(__file__), "nemotron", "labels")
os.makedirs(LABELS_DIR, exist_ok=True)
os.makedirs(LIVE_SESSIONS, exist_ok=True)


@app.route("/api/label/save", methods=["POST"])
def save_labels():
    data = request.get_json()
    clip_index = data.get("clip_index", 0)
    out_path = os.path.join(LABELS_DIR, f"clip_{clip_index}_labels.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return jsonify({"status": "ok", "path": out_path})


@app.route("/api/label/load/<int:clip_index>")
def load_labels(clip_index):
    path = os.path.join(LABELS_DIR, f"clip_{clip_index}_labels.json")
    if not os.path.exists(path):
        return jsonify({"error": "no labels"}), 404
    with open(path, "r", encoding="utf-8") as f:
        return jsonify(json.load(f))


@app.route("/api/live/classify", methods=["POST"])
def classify_live_clip():
    video = request.files.get("video")
    labels_raw = request.form.get("labels")

    if video is None:
        return jsonify({"error": "missing multipart video file"}), 400
    if not labels_raw:
        return jsonify({"error": "missing labels JSON form field"}), 400

    try:
        labels = json.loads(labels_raw)
    except json.JSONDecodeError as exc:
        return jsonify({"error": f"invalid labels JSON: {exc.msg}"}), 400

    session_id = secure_filename(
        str(labels.get("session_id") or request.form.get("session_id") or datetime.utcnow().strftime("session_%Y%m%d_%H%M%S"))
    )
    clip_index = int(labels.get("clip_index", request.form.get("clip_index", 0)))

    session_dir = os.path.join(LIVE_SESSIONS, session_id)
    clips_dir = os.path.join(session_dir, "clips")
    labels_dir = os.path.join(session_dir, "labels")
    raw_labels_dir = os.path.join(session_dir, "raw_labels")
    os.makedirs(clips_dir, exist_ok=True)
    os.makedirs(labels_dir, exist_ok=True)
    os.makedirs(raw_labels_dir, exist_ok=True)

    original_filename = secure_filename(video.filename or "")
    _, ext = os.path.splitext(original_filename)
    if not ext:
        ext = ".webm"

    video_path = os.path.join(clips_dir, f"clip_{clip_index}{ext}")
    raw_labels_path = os.path.join(raw_labels_dir, f"clip_{clip_index}_labels.json")
    labels_path = os.path.join(labels_dir, f"clip_{clip_index}_labels.json")

    video.save(video_path)
    with open(raw_labels_path, "w", encoding="utf-8") as f:
        json.dump(labels, f, indent=2)

    try:
        classified_labels = classify_punch_windows(video_path, labels)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    with open(labels_path, "w", encoding="utf-8") as f:
        json.dump(classified_labels, f, indent=2)

    return jsonify({
        "status": "ok",
        "session_id": session_id,
        "clip_index": clip_index,
        "video_path": video_path,
        "labels_path": labels_path,
        "labels": classified_labels,
    })


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


@app.route("/api/eval/results")
def eval_results():
    path = os.path.join(EVAL_OUTPUT, "results.json")
    if not os.path.exists(path):
        return jsonify({"error": "no eval results — run `python run_model.py` first"}), 404
    with open(path, "r", encoding="utf-8") as f:
        return jsonify(json.load(f))


@app.route("/api/eval/frame/<path:filename>")
def eval_frame(filename):
    from flask import send_from_directory
    frames_dir = os.path.join(EVAL_OUTPUT, "frames")
    frame_path = os.path.join(frames_dir, filename)
    if not os.path.exists(frame_path):
        return jsonify({"error": "frame not found"}), 404
    return send_from_directory(frames_dir, filename, mimetype="image/jpeg")


if __name__ == "__main__":
    app.run(debug=True, port=4000)
