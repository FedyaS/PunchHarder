import { useCallback, useEffect, useRef, useState } from 'react'

const CLIP_DURATION_MS = 5000
const NUM_CLIPS = 3
const COUNTDOWN_SECONDS = 3

const TEST_COUNTDOWN_SECONDS = 1
const TEST_FAKE_RECORDING_MS = 2000

function generateSessionId() {
  const now = new Date()
  const pad = (n, len = 2) => String(n).padStart(len, '0')
  return `session_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function supportedRecordingType() {
  if (!window.MediaRecorder) return ''
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]
  return candidates.find((type) => window.MediaRecorder.isTypeSupported(type)) || ''
}

function extensionForMime(mime) {
  if (mime.includes('mp4')) return 'mp4'
  return 'webm'
}

/**
 * Posts a single clip to the session-clip pipeline endpoint.
 * Returns the fetch promise (not awaited by the caller during recording).
 */
function postClip(sessionId, clipIndex, videoBlob, punches, clipStartMs, clipEndMs) {
  const mimeType = supportedRecordingType()
  const ext = extensionForMime(mimeType || videoBlob.type)
  const formData = new FormData()
  formData.append('video', videoBlob, `clip_${clipIndex}.${ext}`)
  formData.append(
    'labels',
    JSON.stringify({
      session_id: sessionId,
      clip_index: clipIndex,
      clip_start_ms: clipStartMs,
      clip_end_ms: clipEndMs,
      punches,
    }),
  )
  return fetch('/api/live/session-clip', { method: 'POST', body: formData }).then(async (res) => {
    const payload = await res.json()
    if (!res.ok) throw new Error(payload.error || 'session-clip request failed')
    return payload
  })
}

/**
 * State machine: idle → countdown → recording → processing → results
 *
 * @param {Object} opts
 * @param {React.RefObject} opts.liveCameraRef – ref to LiveCamera imperative handle
 * @param {boolean} [opts.testMode] – skip camera, replay a saved session
 * @param {string|null} [opts.testSessionId] – session to replay in test mode
 */
export function useSessionRound({ liveCameraRef, testMode = false, testSessionId = null }) {
  const [phase, setPhase] = useState('idle')
  const [countdown, setCountdown] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [clipIndex, setClipIndex] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const clipPromisesRef = useRef([])
  const clipStopPromisesRef = useRef([])
  const recorderRef = useRef(null)
  const phaseRef = useRef('idle')
  const timerRef = useRef(null)
  const countdownRef = useRef(null)
  const clipBoundaryRef = useRef(null)
  const sessionIdRef = useRef(null)
  const clipIndexRef = useRef(0)
  const roundStartRef = useRef(0)

  const finishRecordingRef = useRef(null)
  phaseRef.current = phase

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    if (clipBoundaryRef.current) {
      clearTimeout(clipBoundaryRef.current)
      clipBoundaryRef.current = null
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop() } catch { /* noop */ }
    }
    recorderRef.current = null
  }, [])

  const preStopPunchesRef = useRef(null)

  const startRecorderForClip = useCallback((stream, sid, idx) => {
    const mimeType = supportedRecordingType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks = []

    const clipStartMs = idx * CLIP_DURATION_MS

    const cam = liveCameraRef.current
    if (cam?.setClipStartTime) cam.setClipStartTime()

    recorder.addEventListener('dataavailable', (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    })

    const stopPromise = new Promise((resolve) => {
      recorder.addEventListener('stop', () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/webm' })
        const clipEndMs = clipStartMs + CLIP_DURATION_MS
        const punches = preStopPunchesRef.current ?? cam?.getPunchEvents?.() ?? []
        preStopPunchesRef.current = null
        const promise = postClip(sid, idx, blob, punches, clipStartMs, clipEndMs)
        clipPromisesRef.current[idx] = promise
        resolve(promise)
      })
    })
    clipStopPromisesRef.current[idx] = stopPromise

    recorder.start()
    recorderRef.current = recorder
  }, [liveCameraRef])

  const scheduleNextClip = useCallback((stream, sid, currentIdx) => {
    clipBoundaryRef.current = setTimeout(() => {
      if (phaseRef.current !== 'recording') return

      const cam = liveCameraRef.current
      preStopPunchesRef.current = cam?.getPunchEvents?.() ?? []

      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }

      const nextIdx = currentIdx + 1
      if (nextIdx < NUM_CLIPS) {
        clipIndexRef.current = nextIdx
        setClipIndex(nextIdx)
        startRecorderForClip(stream, sid, nextIdx)
        scheduleNextClip(stream, sid, nextIdx)
      } else {
        finishRecordingRef.current?.(sid)
      }
    }, CLIP_DURATION_MS)
  }, [liveCameraRef, startRecorderForClip])

  const finishRecording = useCallback(async (sid) => {
    cleanup()
    setPhase('processing')
    phaseRef.current = 'processing'

    try {
      await Promise.allSettled(clipStopPromisesRef.current)
      const settled = await Promise.allSettled(clipPromisesRef.current)
      const clipResults = settled.map((s, i) => {
        if (s.status === 'fulfilled') return s.value
        console.error(`Clip ${i} failed:`, s.reason)
        return { clip_index: i, error: s.reason?.message || 'failed' }
      })

      const baseResults = { session_id: sid, clips: clipResults }
      setResults(baseResults)
      setPhase('results')
      phaseRef.current = 'results'

      // Fire score call in background — non-blocking, merges when ready
      fetch(`/api/live/session/${sid}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((score) => {
          if (score) {
            setResults((prev) => prev ? { ...prev, score } : prev)
          }
        })
        .catch(() => {})
    } catch (err) {
      setError(err?.message || 'Processing failed')
      setPhase('idle')
      phaseRef.current = 'idle'
    }
  }, [cleanup])
  finishRecordingRef.current = finishRecording

  const startTestRound = useCallback(async () => {
    setError(null)
    setResults(null)

    if (!testSessionId) {
      setError('No test session selected — pick one in the debug panel')
      return
    }

    const sid = testSessionId
    sessionIdRef.current = sid
    setSessionId(sid)

    // Quick countdown
    setPhase('countdown')
    phaseRef.current = 'countdown'
    setCountdown(TEST_COUNTDOWN_SECONDS)

    let remaining = TEST_COUNTDOWN_SECONDS
    countdownRef.current = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) {
        clearInterval(countdownRef.current)
        countdownRef.current = null

        // Fake recording phase
        setPhase('recording')
        phaseRef.current = 'recording'
        setClipIndex(0)
        const totalMs = TEST_FAKE_RECORDING_MS
        roundStartRef.current = Date.now()
        setTimeLeft(totalMs)

        timerRef.current = setInterval(() => {
          const elapsed = Date.now() - roundStartRef.current
          const left = Math.max(0, totalMs - elapsed)
          setTimeLeft(left)
          if (left <= 0) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
        }, 100)

        // After the fake recording animation, fire the resend
        setTimeout(async () => {
          cleanup()
          setPhase('processing')
          phaseRef.current = 'processing'

          try {
            const res = await fetch(`/api/live/session-resend/${sid}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mock: true }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'resend failed')
            setResults(data)
            setPhase('results')
            phaseRef.current = 'results'
          } catch (err) {
            setError(err?.message || 'Test round failed')
            setPhase('idle')
            phaseRef.current = 'idle'
          }
        }, totalMs)
      }
    }, 1000)
  }, [testSessionId, cleanup])

  const startRound = useCallback(async () => {
    if (testMode) {
      return startTestRound()
    }

    setError(null)
    setResults(null)
    clipPromisesRef.current = new Array(NUM_CLIPS).fill(null)
    clipStopPromisesRef.current = new Array(NUM_CLIPS).fill(null)

    const cam = liveCameraRef.current
    if (!cam) {
      setError('Camera not ready')
      return
    }

    if (!cam.isLive) {
      await cam.startCamera()
    }

    let stream = cam.getStream?.()
    if (!stream) {
      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise((r) => setTimeout(r, 150))
        stream = cam.getStream?.()
        if (stream) break
      }
    }
    if (!stream) {
      setError('Camera stream unavailable — check permissions')
      return
    }

    cam.resetPunchCount?.()

    const sid = generateSessionId()
    sessionIdRef.current = sid
    setSessionId(sid)

    // Countdown phase
    setPhase('countdown')
    phaseRef.current = 'countdown'
    setCountdown(COUNTDOWN_SECONDS)

    let remaining = COUNTDOWN_SECONDS
    countdownRef.current = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
        beginRecording(stream, sid)
      }
    }, 1000)
  }, [liveCameraRef, testMode, startTestRound]) // eslint-disable-line react-hooks/exhaustive-deps

  const beginRecording = useCallback((stream, sid) => {
    setPhase('recording')
    phaseRef.current = 'recording'
    clipIndexRef.current = 0
    setClipIndex(0)

    const totalMs = NUM_CLIPS * CLIP_DURATION_MS
    roundStartRef.current = Date.now()
    setTimeLeft(totalMs)

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - roundStartRef.current
      const left = Math.max(0, totalMs - elapsed)
      setTimeLeft(left)
      if (left <= 0) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }, 100)

    startRecorderForClip(stream, sid, 0)
    scheduleNextClip(stream, sid, 0)
  }, [startRecorderForClip, scheduleNextClip])

  const resetSession = useCallback(() => {
    cleanup()
    setPhase('idle')
    phaseRef.current = 'idle'
    setCountdown(0)
    setTimeLeft(0)
    setClipIndex(0)
    setSessionId(null)
    setResults(null)
    setError(null)
    clipPromisesRef.current = []
    clipStopPromisesRef.current = []
  }, [cleanup])

  useEffect(() => cleanup, [cleanup])

  const showResults = useCallback((data) => {
    cleanup()
    setSessionId(data.session_id || null)
    setResults(data)
    setPhase('results')
    phaseRef.current = 'results'
  }, [cleanup])

  return {
    phase,
    countdown,
    timeLeft,
    clipIndex,
    sessionId,
    results,
    error,
    startRound,
    resetSession,
    showResults,
  }
}
