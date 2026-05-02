# PunchHarder

**AI-powered real-time shadowboxing coach: punch in front of your camera, get live feedback on form, speed, and technique.**

## Architecture

```
Camera → [FE: React + MediaPipe] → punch detection, counting, speed/power tracking
                |                         |
                |  WebSocket (frames)     |  WebSocket (video clips + punch data)
                v                         v
        [BE: YOLOv8]              [BE: Nemotron 3 Nano Omni]
        Classifies punch type     Analyzes form, gives coaching
        (jab/hook/uppercut)       feedback on technique
        Returns label + velocity  Returns natural language advice
                |                         |
                v                         v
            FE updates punch log      FE displays feedback panel
```

## Stack
- **Frontend**: React (Vite), MediaPipe (pose detection / punch detection in-browser)
- **Backend**: Python (Flask), WebSockets
- **Punch Classification**: YOLOv8 (custom trained, runs on backend)
- **Form Analysis**: nvidia/nemotron-3-nano-omni-30b-a3b-reasoning (multimodal, receives video clips)

## Data Flow
1. FE detects punch via MediaPipe → increments counter immediately (no server round-trip)
2. FE sends burst of frames to BE over WebSocket → YOLOv8 classifies punch type, returns label async
3. Periodically (configurable hybrid: time interval + punch count threshold), FE sends a video clip + punch summary to BE → Nemotron analyzes and returns coaching feedback
