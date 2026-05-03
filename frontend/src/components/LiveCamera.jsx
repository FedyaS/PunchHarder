import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { useWebcam } from '../hooks/useWebcam'
import { usePoseLandmarker } from '../hooks/usePoseLandmarker'

function statusLabel(status) {
  if (status === 'loading') return 'Requesting camera access...'
  if (status === 'live') return 'Camera is live'
  if (status === 'error') return 'Camera unavailable'
  return 'Camera is off'
}

function trackingLabel(status) {
  if (status === 'loading') return 'Loading MediaPipe pose model...'
  if (status === 'detecting') return 'Detecting pose landmarks'
  if (status === 'error') return 'Pose tracking unavailable'
  return 'Pose tracking is idle'
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

function recordStreamClip(stream, durationMs) {
  return new Promise((resolve, reject) => {
    if (!window.MediaRecorder) {
      reject(new Error('This browser does not support MediaRecorder.'))
      return
    }

    const mimeType = supportedRecordingType()
    const recorder = new window.MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks = []

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    })
    recorder.addEventListener('error', () => {
      reject(new Error('Failed to record punch clip.'))
    })
    recorder.addEventListener('stop', () => {
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/webm' }))
    })

    recorder.start()
    window.setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop()
    }, durationMs)
  })
}

export const LiveCamera = forwardRef(function LiveCamera(
  { className = '', embedded = false, onMetrics, onPunchClipReady },
  ref,
) {
  const canvasRef = useRef(null)
  const { error, isLive, startCamera, status, stopCamera, stream, videoRef } = useWebcam()
  const {
    error: trackingError,
    poseCount,
    status: trackingStatus,
  } = usePoseLandmarker({
    canvasRef,
    enabled: isLive,
    videoRef,
  })

  const recordPunchClip = useCallback(
    async (labels, { durationMs = 1500, filename } = {}) => {
      if (!stream) {
        throw new Error('Camera stream is not live.')
      }

      const videoBlob = await recordStreamClip(stream, durationMs)
      const result = await onPunchClipReady?.({
        filename,
        labels,
        videoBlob,
      })

      return result ?? { labels, videoBlob }
    },
    [onPunchClipReady, stream],
  )

  useImperativeHandle(
    ref,
    () => ({
      startCamera,
      stopCamera,
      recordPunchClip,
      isLive,
      status,
    }),
    [startCamera, stopCamera, recordPunchClip, isLive, status],
  )

  useEffect(() => {
    onMetrics?.({
      error,
      isLive,
      poseCount,
      status,
      trackingError,
      trackingStatus,
    })
  }, [error, isLive, onMetrics, poseCount, status, trackingError, trackingStatus])

  const videoStack = (
    <>
      <video
        ref={videoRef}
        className="h-full w-full scale-x-[-1] object-cover"
        muted
        playsInline
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1] object-cover"
      />

      {!isLive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/75 text-center px-4 z-10">
          <div>
            <p className="text-lg font-semibold text-on-surface font-headline-md">
              {statusLabel(status)}
            </p>
            <p className="mt-2 text-sm text-on-surface-variant font-body-md">
              Use GO LIVE or Start camera — your browser will ask for permission.
            </p>
          </div>
        </div>
      )}
    </>
  )

  if (embedded) {
    return (
      <div className={`relative flex h-full min-h-[280px] w-full flex-col bg-black ${className}`}>
        <div className="absolute right-6 top-6 z-20 flex gap-2">
          <button
            type="button"
            className="bg-primary-container text-on-primary-container px-4 py-2 font-label-bold text-xs tracking-wider rounded-lg border-0 shadow-lg transition-all hover:bg-primary hover:text-on-primary active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={status === 'loading' || isLive}
            onClick={startCamera}
          >
            Start camera
          </button>
          <button
            type="button"
            className="border border-surface-container-highest bg-surface-container-low/90 px-4 py-2 font-label-bold text-xs text-on-surface backdrop-blur-md transition-all hover:bg-surface-container-high active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!isLive}
            onClick={stopCamera}
          >
            Stop
          </button>
        </div>

        <div className="relative min-h-[240px] flex-1 overflow-hidden">{videoStack}</div>

        {(error || trackingError) && (
          <div className="absolute bottom-24 left-4 right-4 z-20 rounded-lg border border-error/40 bg-error-container/95 px-4 py-2 font-label-bold text-[11px] text-on-error-container md:bottom-4">
            {error && <p>Camera: {error}</p>}
            {trackingError && <p className={error ? 'mt-1' : ''}>Pose: {trackingError}</p>}
          </div>
        )}
      </div>
    )
  }

  return (
    <section
      className={`w-full max-w-5xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 ${className}`}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-300">
            Live Camera
          </p>
          <h2 className="mt-2 text-3xl font-bold text-white">PunchHarder training view</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-300">
            Start the webcam and stand centered in frame. MediaPipe will log raw pose
            landmarks to your browser console when it sees you.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            className="rounded-full bg-green-400 px-5 py-2 font-semibold text-gray-950 transition hover:bg-green-300 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-300"
            disabled={status === 'loading' || isLive}
            type="button"
            onClick={startCamera}
          >
            Start Camera
          </button>
          <button
            className="rounded-full border border-white/20 px-5 py-2 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-gray-500"
            disabled={!isLive}
            type="button"
            onClick={stopCamera}
          >
            Stop
          </button>
        </div>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-gray-900">
        {videoStack}
      </div>

      <div className="mt-4 rounded-2xl bg-gray-950/70 p-4 text-sm text-gray-300">
        <p>
          Status: <span className="font-mono text-green-300">{statusLabel(status)}</span>
        </p>
        <p className="mt-2">
          MediaPipe:{' '}
          <span className="font-mono text-green-300">{trackingLabel(trackingStatus)}</span>
        </p>
        <p className="mt-2">
          Poses in frame: <span className="font-mono text-green-300">{poseCount}</span>
        </p>
        {error && <p className="mt-2 text-red-300">Error: {error}</p>}
        {trackingError && <p className="mt-2 text-red-300">MediaPipe error: {trackingError}</p>}
      </div>
    </section>
  )
})
