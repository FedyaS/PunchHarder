import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

const MEDIAPIPE_VERSION = '0.10.35'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

export function usePoseLandmarker({ enabled, videoRef }) {
  const animationFrameRef = useRef(null)
  const landmarkerRef = useRef(null)
  const lastLogTimeRef = useRef(0)
  const lastVideoTimeRef = useRef(-1)
  const [error, setError] = useState('')
  const [poseCount, setPoseCount] = useState(0)
  const [status, setStatus] = useState('idle')

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

    function detectFrame() {
      const video = videoRef.current
      const landmarker = landmarkerRef.current

      if (!isCancelled && video && landmarker && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime

          const now = performance.now()
          const result = landmarker.detectForVideo(video, now)
          const landmarks = result.landmarks ?? []

          setPoseCount(landmarks.length)

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
    }
  }, [enabled, videoRef])

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
    status,
  }
}
