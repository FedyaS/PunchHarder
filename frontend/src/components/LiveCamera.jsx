import { useRef } from 'react'
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

export function LiveCamera() {
  const canvasRef = useRef(null)
  const { error, isLive, startCamera, status, stopCamera, videoRef } = useWebcam()
  const {
    error: trackingError,
    poseCount,
    status: trackingStatus,
  } = usePoseLandmarker({
    canvasRef,
    enabled: isLive,
    videoRef,
  })

  return (
    <section className="w-full max-w-5xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30">
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
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950/70 text-center">
            <div>
              <p className="text-lg font-semibold text-white">{statusLabel(status)}</p>
              <p className="mt-2 text-sm text-gray-400">
                Your browser will ask for camera permission when you start.
              </p>
            </div>
          </div>
        )}
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
}
