import { useCallback, useEffect, useRef, useState } from 'react'
import { DrawingUtils, FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

const MEDIAPIPE_VERSION = '0.10.35'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

const MIN_VISIBILITY = 0.3
const COOLDOWN_MS = 450
const BAD_FRAMES_TO_RESET = 12
const DISTANCE_RISE_THRESHOLD = 0.8
const DISTANCE_FALL_THRESHOLD = 0.1
const MIN_PUNCH_DISTANCE_GAIN = 0.9
const SMOOTHING = 0.7
const BASELINE_FREEZE_MS = 400

const LANDMARKS = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
}

const PUNCH_SIDES = {
  left: {
    shoulderIndex: LANDMARKS.leftShoulder,
    wristIndex: LANDMARKS.leftWrist,
    hipIndex: LANDMARKS.leftHip,
  },
  right: {
    shoulderIndex: LANDMARKS.rightShoulder,
    wristIndex: LANDMARKS.rightWrist,
    hipIndex: LANDMARKS.rightHip,
  },
}

function createArmState() {
  return {
    punching: false,
    smoothedDist: null,
    baselineDist: null,
    peakDist: null,
    punchStartTime: null,
    lastPunchEndTime: 0,
    baselineFrozenUntil: 0,
    consecutiveBadFrames: 0,
    stalledFrames: 0,
  }
}

function createPunchState() {
  return { left: createArmState(), right: createArmState() }
}

function landmarkVisible(lm) {
  return Boolean(lm) && (lm.visibility ?? 1) >= MIN_VISIBILITY
}

function dist2d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function shoulderWidth(poseLandmarks) {
  const ls = poseLandmarks[LANDMARKS.leftShoulder]
  const rs = poseLandmarks[LANDMARKS.rightShoulder]
  if (!landmarkVisible(ls) || !landmarkVisible(rs)) return null
  return Math.max(dist2d(ls, rs), 0.05)
}

function getCompositeDist(poseLandmarks, side, scale) {
  const { shoulderIndex, wristIndex, hipIndex } = PUNCH_SIDES[side]
  const shoulder = poseLandmarks[shoulderIndex]
  const wrist = poseLandmarks[wristIndex]
  const hip = poseLandmarks[hipIndex]

  if (!landmarkVisible(shoulder) || !landmarkVisible(wrist)) return null

  const dShoulder = dist2d(wrist, shoulder) / scale
  const dHip = landmarkVisible(hip) ? dist2d(wrist, hip) / scale : 0

  return Math.max(dShoulder, dHip)
}

export function usePoseLandmarker({ canvasRef, enabled, videoRef }) {
  const animationFrameRef = useRef(null)
  const drawingUtilsRef = useRef(null)
  const landmarkerRef = useRef(null)
  const lastVideoTimeRef = useRef(-1)
  const punchStateRef = useRef(createPunchState())
  const smoothedScaleRef = useRef(null)
  const [error, setError] = useState('')
  const [poseCount, setPoseCount] = useState(0)
  const [punchCount, setPunchCount] = useState(0)
  const [status, setStatus] = useState('idle')

  const resetPunchCount = useCallback(() => {
    punchStateRef.current = createPunchState()
    smoothedScaleRef.current = null
    setPunchCount(0)
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function loadPoseLandmarker() {
      if (landmarkerRef.current) return landmarkerRef.current
      setError('')
      setStatus('loading')
      const vision = await FilesetResolver.forVisionTasks(WASM_URL)
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        numPoses: 1,
        runningMode: 'VIDEO',
      })
      landmarkerRef.current = landmarker
      return landmarker
    }

    function clearCanvas() {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    function drawPoseOverlay(video, landmarks) {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx || video.videoWidth === 0 || video.videoHeight === 0) return

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        drawingUtilsRef.current = new DrawingUtils(ctx)
      }

      const du = drawingUtilsRef.current ?? new DrawingUtils(ctx)
      drawingUtilsRef.current = du
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      landmarks.forEach((pose) => {
        du.drawConnectors(pose, PoseLandmarker.POSE_CONNECTIONS, {
          color: '#22c55e',
          lineWidth: 4,
        })
        du.drawLandmarks(pose, {
          color: '#facc15',
          fillColor: '#facc15',
          lineWidth: 2,
          radius: 5,
        })
      })
    }

    function updatePunchCounter(poseLandmarks, now) {
      if (!poseLandmarks) {
        for (const side of Object.keys(PUNCH_SIDES)) {
          const arm = punchStateRef.current[side]
          arm.consecutiveBadFrames++
          if (arm.consecutiveBadFrames >= BAD_FRAMES_TO_RESET) {
            punchStateRef.current[side] = createArmState()
          }
        }
        return
      }

      const rawScale = shoulderWidth(poseLandmarks)
      if (!rawScale) return
      smoothedScaleRef.current =
        smoothedScaleRef.current === null
          ? rawScale
          : smoothedScaleRef.current * 0.7 + rawScale * 0.3
      const scale = smoothedScaleRef.current

      for (const side of Object.keys(PUNCH_SIDES)) {
        const arm = punchStateRef.current[side]
        const rawDist = getCompositeDist(poseLandmarks, side, scale)

        if (rawDist === null) {
          arm.consecutiveBadFrames++
          if (arm.consecutiveBadFrames >= BAD_FRAMES_TO_RESET) {
            punchStateRef.current[side] = createArmState()
          }
          continue
        }

        arm.consecutiveBadFrames = 0

        const smoothed =
          arm.smoothedDist === null
            ? rawDist
            : arm.smoothedDist * SMOOTHING + rawDist * (1 - SMOOTHING)
        arm.smoothedDist = smoothed

        if (!arm.punching) {
          if (arm.baselineDist === null) {
            arm.baselineDist = smoothed
          } else if (now >= arm.baselineFrozenUntil) {
            arm.baselineDist = Math.min(arm.baselineDist, smoothed * 0.95 + arm.baselineDist * 0.05)
          }

          const rise = smoothed - arm.baselineDist
          const cooledDown = now - arm.lastPunchEndTime >= COOLDOWN_MS

          if (rise > DISTANCE_RISE_THRESHOLD && cooledDown) {
            arm.punching = true
            arm.punchStartTime = now
            arm.peakDist = smoothed
          }
        } else {
          if (smoothed > arm.peakDist + 0.005) {
            arm.peakDist = smoothed
            arm.stalledFrames = 0
          } else {
            arm.stalledFrames++
          }

          const fallen = arm.peakDist - smoothed
          const gain = arm.peakDist - arm.baselineDist
          const stalled = arm.stalledFrames >= 4

          if ((fallen > DISTANCE_FALL_THRESHOLD || stalled) && gain >= MIN_PUNCH_DISTANCE_GAIN) {
            setPunchCount((c) => c + 1)
            console.log(`${side} punch`, {
              start: arm.punchStartTime,
              end: now,
              gain: gain.toFixed(3),
              peak: arm.peakDist.toFixed(3),
            })
            arm.punching = false
            arm.lastPunchEndTime = now
            arm.baselineFrozenUntil = now + BASELINE_FREEZE_MS
            arm.peakDist = null
            arm.punchStartTime = null
            arm.stalledFrames = 0
          } else if (stalled && gain < MIN_PUNCH_DISTANCE_GAIN) {
            arm.punching = false
            arm.baselineDist = smoothed
            arm.peakDist = null
            arm.punchStartTime = null
            arm.stalledFrames = 0
          } else if (now - arm.punchStartTime > 500) {
            arm.punching = false
            arm.baselineDist = smoothed
            arm.peakDist = null
            arm.punchStartTime = null
            arm.stalledFrames = 0
          }
        }
      }
    }

    function detectFrame() {
      const video = videoRef.current
      const landmarker = landmarkerRef.current

      if (
        !isCancelled &&
        video &&
        landmarker &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime
          const now = performance.now()
          const result = landmarker.detectForVideo(video, now)
          const landmarks = result.landmarks ?? []

          setPoseCount(landmarks.length)
          drawPoseOverlay(video, landmarks)
          updatePunchCounter(landmarks[0], now)
        }

        animationFrameRef.current = requestAnimationFrame(detectFrame)
      }
    }

    async function startDetection() {
      if (!enabled) {
        setStatus('idle')
        setPoseCount(0)
        clearCanvas()
        punchStateRef.current = createPunchState()
        smoothedScaleRef.current = null
        return
      }

      try {
        await loadPoseLandmarker()
        if (!isCancelled) {
          setStatus('detecting')
          animationFrameRef.current = requestAnimationFrame(detectFrame)
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err?.message || 'Failed to load MediaPipe pose tracking.')
          setStatus('error')
        }
      }
    }

    startDetection()

    return () => {
      isCancelled = true
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      lastVideoTimeRef.current = -1
      clearCanvas()
      punchStateRef.current = createPunchState()
      smoothedScaleRef.current = null
    }
  }, [canvasRef, enabled, videoRef])

  useEffect(() => {
    return () => {
      if (landmarkerRef.current) {
        landmarkerRef.current.close()
        landmarkerRef.current = null
      }
    }
  }, [])

  return { error, poseCount, punchCount, resetPunchCount, status }
}
