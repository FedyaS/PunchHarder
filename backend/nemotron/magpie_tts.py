"""
Magpie TTS Multilingual via NVIDIA NVCF gRPC — the same TTS used in the
Nemotron Voice Agent blueprint (https://build.nvidia.com/nvidia/nemotron-voice-agent).

Cloud usage follows the public Magpie TTS example:
  grpc.nvcf.nvidia.com:443 + function-id + Bearer NVIDIA_API_KEY
"""

from __future__ import annotations

import inspect
import io
import os
import wave
from typing import Any, List, Optional, Tuple

# build.nvidia.com / magpie-tts-multilingual "Try API" function id
MAGPIE_NVC_FUNCTION_ID = "877104f7-e885-42b9-8de8-f6e4c6303969"
DEFAULT_VOICE = "Magpie-Multilingual.EN-US.Mia"
NVC_URI = "grpc.nvcf.nvidia.com:443"


def _riva_auth_for_version(riva_client: Any, **candidates: Any) -> Any:
    """
    nvidia-riva-client wheels differ: some Auth.__init__ omit ssl_* kwargs.
    Only pass parameters the installed Auth actually accepts.
    """
    Auth = riva_client.Auth
    names = set(inspect.signature(Auth.__init__).parameters) - {"self"}
    kw = {k: v for k, v in candidates.items() if k in names}
    # Older / alternate clients used `metadata` instead of `metadata_args`
    if "metadata_args" not in names and "metadata" in names and "metadata_args" in candidates:
        kw["metadata"] = candidates["metadata_args"]
    return Auth(**kw)


def tts_backend_ready() -> Tuple[bool, str]:
    if not (os.environ.get("NVIDIA_API_KEY") or "").strip():
        return False, "no_api_key"
    try:
        import riva.client  # noqa: F401
    except ImportError:
        return False, "riva_client_missing"
    return True, "ok"


def synthesize_speech_wav_bytes(
    text: str,
    api_key: str,
    *,
    function_id: Optional[str] = None,
    voice: Optional[str] = None,
    language_code: str = "en-US",
) -> bytes:
    """Return a mono 16-bit PCM WAV containing synthesized speech."""
    import riva.client
    from riva.client.proto.riva_audio_pb2 import AudioEncoding

    text = (text or "").strip()
    if not text:
        raise ValueError("empty text")

    function_id = (function_id or os.environ.get("RIVA_TTS_FUNCTION_ID") or MAGPIE_NVC_FUNCTION_ID).strip()
    voice = (voice or os.environ.get("RIVA_TTS_VOICE") or DEFAULT_VOICE).strip()
    sample_rate_hz = int(os.environ.get("RIVA_TTS_SAMPLE_RATE_HZ", "24000"))

    metadata_args: List[List[str]] = [
        ["function-id", function_id],
        ["authorization", f"Bearer {api_key.strip()}"],
    ]
    grpc_opts = [
        ("grpc.max_receive_message_length", 64 * 1024 * 1024),
        ("grpc.max_send_message_length", 64 * 1024 * 1024),
    ]

    auth = _riva_auth_for_version(
        riva.client,
        ssl_root_cert=None,
        ssl_client_cert=None,
        ssl_client_key=None,
        use_ssl=True,
        uri=NVC_URI,
        metadata_args=metadata_args,
        options=grpc_opts,
        use_aio=False,
    )
    service = riva.client.SpeechSynthesisService(auth)
    resp = service.synthesize(
        text,
        voice,
        language_code,
        sample_rate_hz=sample_rate_hz,
        encoding=AudioEncoding.LINEAR_PCM,
    )
    pcm = resp.audio

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate_hz)
        wf.writeframesraw(pcm)
    return buf.getvalue()
