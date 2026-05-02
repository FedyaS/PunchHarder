import { useCallback, useEffect, useRef, useState } from 'react'
import { DrawingUtils, FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

const MEDIAPIPE_VERSION = '0.10.35'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const HISTORY_SAMPLE_LIMIT = 12
const PUNCH_COOLDOWN_MS = 550
const MIN_VISIBILITY = 0.45
const GUARD_EXTENSION_MAX = 1.3
const BENT_ELBOW_REARM_ANGLE = 135
const STRAIGHT_ELBOW_MIN = 145
const EXTENDED_EXTENSION_MIN = 1.25
const MIN_EXTENSION_GAIN = 0.18
const EXTENSION_VELOCITY_THRESHOLD = 1.2

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

const initialPunchStats = {
  total: 0,
  left: 0,
  right: 0,
  lastPunch: null,
}

function createInitialPunchState() {
  return {
    left: { armed: false },
    right: { armed: false },
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
    wrist: {
      x: wrist.x,
      y: wrist.y,
      z: wrist.z ?? 0,
    },
  }
}

export function usePoseLandmarker({ canvasRef, enabled, videoRef }) {
  const animationFrameRef = useRef(null)
  const drawingUtilsRef = useRef(null)
  const landmarkHistoryRef = useRef({ left: [], right: [] })
  const landmarkerRef = useRef(null)
  const lastLogTimeRef = useRef(0)
  const lastPunchTimeRef = useRef({ left: 0, right: 0 })
  const lastVideoTimeRef = useRef(-1)
  const punchStateRef = useRef(createInitialPunchState())
  const [error, setError] = useState('')
  const [poseCount, setPoseCount] = useState(0)
  const [punchStats, setPunchStats] = useState(initialPunchStats)
  const [status, setStatus] = useState('idle')

  const resetPunchStats = useCallback(() => {
    landmarkHistoryRef.current = { left: [], right: [] }
    lastPunchTimeRef.current = { left: 0, right: 0 }
    punchStateRef.current = createInitialPunchState()
    setPunchStats(initialPunchStats)
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
      landmarkHistoryRef.current = { left: [], right: [] }
      punchStateRef.current = createInitialPunchState()
    }

    function recordPunch(side, now, velocity, sample) {
      lastPunchTimeRef.current[side] = now

      setPunchStats((currentStats) => ({
        ...currentStats,
        total: currentStats.total + 1,
        [side]: currentStats[side] + 1,
        lastPunch: {
          hand: PUNCH_SIDES[side].label,
          time: new Date().toLocaleTimeString(),
          velocity: Number(velocity.toFixed(2)),
        },
      }))

      console.log(`${PUNCH_SIDES[side].label} punch detected`, {
        elbowAngle: Number(sample.elbowAngle.toFixed(1)),
        extension: Number(sample.extension.toFixed(2)),
        velocity: Number(velocity.toFixed(2)),
      })
    }

    function updatePunchCounter(poseLandmarks, now) {
      if (!poseLandmarks) {
        clearPunchHistory()
        return
      }

      Object.keys(PUNCH_SIDES).forEach((side) => {
        const sample = createPunchSample(poseLandmarks, side, now)

        if (!sample) {
          landmarkHistoryRef.current[side] = []
          return
        }

        const history = landmarkHistoryRef.current[side]

        history.push(sample)

        if (history.length > HISTORY_SAMPLE_LIMIT) {
          history.shift()
        }

        const sideState = punchStateRef.current[side]

        if (
          sample.extension <= GUARD_EXTENSION_MAX ||
          sample.elbowAngle <= BENT_ELBOW_REARM_ANGLE
        ) {
          sideState.armed = true
        }

        if (history.length < 4) return

        const recentHistory = history.slice(-8)
        const windowStart = recentHistory[0]
        const elapsedSeconds = (sample.time - windowStart.time) / 1000

        if (elapsedSeconds < 0.08) return

        const minExtension = Math.min(
          ...recentHistory.map((historySample) => historySample.extension),
        )
        const extensionGain = sample.extension - minExtension
        const extensionVelocity = (sample.extension - windowStart.extension) / elapsedSeconds
        const isArmStraight = sample.elbowAngle >= STRAIGHT_ELBOW_MIN
        const isExtendedEnough = sample.extension >= EXTENDED_EXTENSION_MIN
        const isClearExtension =
          isArmStraight &&
          isExtendedEnough &&
          (extensionGain >= MIN_EXTENSION_GAIN ||
            extensionVelocity >= EXTENSION_VELOCITY_THRESHOLD)
        const isOnCooldown = now - lastPunchTimeRef.current[side] < PUNCH_COOLDOWN_MS

        if (sideState.armed && !isOnCooldown && isClearExtension) {
          sideState.armed = false
          recordPunch(side, now, extensionVelocity, sample)
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
    punchStats,
    resetPunchStats,
    status,
  }
}
