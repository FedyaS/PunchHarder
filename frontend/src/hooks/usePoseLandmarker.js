import { useCallback, useEffect, useRef, useState } from 'react'
import { DrawingUtils, FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

const MEDIAPIPE_VERSION = '0.10.35'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const MIN_VISIBILITY = 0.45
const COCKED_EXTENSION_MAX = 0.6
const COCKED_ELBOW_MAX = 120
const EXTENDING_WRIST_VELOCITY_MIN = 1.2
const EXTENDED_ELBOW_MIN = 160
const EXTENDED_EXTENSION_MIN = 0.85
const RETRACTED_EXTENSION_MAX = 0.7
const REFRACTORY_PERIOD_MS = 200

const PUNCH_PHASE = {
  idle: 'IDLE',
  cocked: 'COCKED',
  extending: 'EXTENDING',
  extended: 'EXTENDED',
}

const LANDMARKS = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
}

const PUNCH_SIDES = {
  left: {
    label: 'Left',
    elbowIndex: LANDMARKS.leftElbow,
    shoulderIndex: LANDMARKS.leftShoulder,
    wristIndex: LANDMARKS.leftWrist,
  },
  right: {
    label: 'Right',
    elbowIndex: LANDMARKS.rightElbow,
    shoulderIndex: LANDMARKS.rightShoulder,
    wristIndex: LANDMARKS.rightWrist,
  },
}

function createInitialArmPunchState() {
  return {
    lastCountTime: Number.NEGATIVE_INFINITY,
    lastSample: null,
    phase: PUNCH_PHASE.idle,
  }
}

function createInitialPunchState() {
  return {
    left: createInitialArmPunchState(),
    right: createInitialArmPunchState(),
  }
}

function landmarkIsVisible(landmark) {
  return Boolean(landmark) && (landmark.visibility ?? 1) >= MIN_VISIBILITY
}

function distance2d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function angleDegrees(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y }
  const cb = { x: c.x - b.x, y: c.y - b.y }
  const dot = ab.x * cb.x + ab.y * cb.y
  const magnitude = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y)

  if (magnitude === 0) return 0

  const cosine = Math.max(-1, Math.min(1, dot / magnitude))
  return (Math.acos(cosine) * 180) / Math.PI
}

function shoulderScale(poseLandmarks) {
  const leftShoulder = poseLandmarks[LANDMARKS.leftShoulder]
  const rightShoulder = poseLandmarks[LANDMARKS.rightShoulder]

  if (!landmarkIsVisible(leftShoulder) || !landmarkIsVisible(rightShoulder)) {
    return null
  }

  return Math.max(distance2d(leftShoulder, rightShoulder), 0.1)
}

function createPunchSample(poseLandmarks, side, now) {
  const scale = shoulderScale(poseLandmarks)
  const { elbowIndex, shoulderIndex, wristIndex } = PUNCH_SIDES[side]
  const elbow = poseLandmarks[elbowIndex]
  const shoulder = poseLandmarks[shoulderIndex]
  const wrist = poseLandmarks[wristIndex]

  if (
    !scale ||
    !landmarkIsVisible(elbow) ||
    !landmarkIsVisible(shoulder) ||
    !landmarkIsVisible(wrist)
  ) {
    return null
  }

  return {
    elbowAngle: angleDegrees(shoulder, elbow, wrist),
    extension: distance2d(wrist, shoulder) / scale,
    time: now,
  }
}

function wristVelocityRelative(previousSample, sample) {
  if (!previousSample) return 0

  const elapsedSeconds = (sample.time - previousSample.time) / 1000

  if (elapsedSeconds <= 0) return 0

  return (sample.extension - previousSample.extension) / elapsedSeconds
}

export function usePoseLandmarker({ canvasRef, enabled, videoRef }) {
  const animationFrameRef = useRef(null)
  const drawingUtilsRef = useRef(null)
  const landmarkerRef = useRef(null)
  const lastLogTimeRef = useRef(0)
  const lastVideoTimeRef = useRef(-1)
  const punchStateRef = useRef(createInitialPunchState())
  const [error, setError] = useState('')
  const [poseCount, setPoseCount] = useState(0)
  const [punchCount, setPunchCount] = useState(0)
  const [status, setStatus] = useState('idle')

  const resetPunchCount = useCallback(() => {
    punchStateRef.current = createInitialPunchState()
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
        baseOptions: {
          modelAssetPath: MODEL_URL,
        },
        numPoses: 1,
        runningMode: 'VIDEO',
      })

      landmarkerRef.current = landmarker
      return landmarker
    }

    function clearCanvas() {
      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')

      if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    function drawPoseOverlay(video, landmarks) {
      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')

      if (!canvas || !context || video.videoWidth === 0 || video.videoHeight === 0) {
        return
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        drawingUtilsRef.current = new DrawingUtils(context)
      }

      const drawingUtils = drawingUtilsRef.current ?? new DrawingUtils(context)
      drawingUtilsRef.current = drawingUtils

      context.clearRect(0, 0, canvas.width, canvas.height)

      landmarks.forEach((poseLandmarks) => {
        drawingUtils.drawConnectors(poseLandmarks, PoseLandmarker.POSE_CONNECTIONS, {
          color: '#22c55e',
          lineWidth: 4,
        })
        drawingUtils.drawLandmarks(poseLandmarks, {
          color: '#facc15',
          fillColor: '#facc15',
          lineWidth: 2,
          radius: 5,
        })
      })
    }

    function clearPunchHistory() {
      punchStateRef.current = createInitialPunchState()
    }

    function recordPunch(side, wristVelocity, sample) {
      setPunchCount((currentCount) => currentCount + 1)

      console.log(`${PUNCH_SIDES[side].label} punch detected`, {
        elbowAngle: Number(sample.elbowAngle.toFixed(1)),
        extension: Number(sample.extension.toFixed(2)),
        wristVelocity: Number(wristVelocity.toFixed(2)),
      })
    }

    function updatePunchCounter(poseLandmarks, now) {
      if (!poseLandmarks) {
        clearPunchHistory()
        return
      }

      Object.keys(PUNCH_SIDES).forEach((side) => {
        const sample = createPunchSample(poseLandmarks, side, now)
        const sideState = punchStateRef.current[side]

        if (!sample) {
          punchStateRef.current[side] = createInitialArmPunchState()
          return
        }

        const wristVelocity = wristVelocityRelative(sideState.lastSample, sample)
        const isCocked =
          sample.extension < COCKED_EXTENSION_MAX && sample.elbowAngle < COCKED_ELBOW_MAX
        const isExtending = wristVelocity > EXTENDING_WRIST_VELOCITY_MIN
        const isExtended =
          sample.elbowAngle > EXTENDED_ELBOW_MIN && sample.extension > EXTENDED_EXTENSION_MIN
        const canReturnIdle =
          sample.extension < RETRACTED_EXTENSION_MAX &&
          now - sideState.lastCountTime >= REFRACTORY_PERIOD_MS

        sideState.lastSample = sample

        if (sideState.phase === PUNCH_PHASE.idle) {
          if (isCocked) {
            sideState.phase = PUNCH_PHASE.cocked
          }
          return
        }

        if (sideState.phase === PUNCH_PHASE.cocked) {
          if (isExtending) {
            sideState.phase = PUNCH_PHASE.extending
          } else if (!isCocked) {
            sideState.phase = PUNCH_PHASE.idle
          }
          return
        }

        if (sideState.phase === PUNCH_PHASE.extending) {
          if (isExtended) {
            sideState.phase = PUNCH_PHASE.extended
            sideState.lastCountTime = now
            recordPunch(side, wristVelocity, sample)
          } else if (isCocked) {
            sideState.phase = PUNCH_PHASE.cocked
          } else if (canReturnIdle) {
            sideState.phase = PUNCH_PHASE.idle
          }
          return
        }

        if (sideState.phase === PUNCH_PHASE.extended && canReturnIdle) {
          sideState.phase = PUNCH_PHASE.idle
        }
      })
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

          if (landmarks.length > 0 && now - lastLogTimeRef.current > 500) {
            lastLogTimeRef.current = now
            console.log('MediaPipe pose landmarks:', landmarks)
          }
        }

        animationFrameRef.current = requestAnimationFrame(detectFrame)
      }
    }

    async function startDetection() {
      if (!enabled) {
        setStatus('idle')
        setPoseCount(0)
        clearCanvas()
        clearPunchHistory()
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
      clearPunchHistory()
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

  return {
    error,
    poseCount,
    punchCount,
    resetPunchCount,
    status,
  }
}
