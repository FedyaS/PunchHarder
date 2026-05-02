import { useCallback, useEffect, useRef, useState } from 'react'

const cameraConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user',
  },
  audio: false,
}

export function useWebcam() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setStatus('idle')
  }, [])

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not support camera access.')
      setStatus('error')
      return
    }

    try {
      setError('')
      setStatus('loading')

      const stream = await navigator.mediaDevices.getUserMedia(cameraConstraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setStatus('live')
    } catch (err) {
      setError(err?.message || 'Camera permission was denied or unavailable.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  return {
    error,
    isLive: status === 'live',
    startCamera,
    status,
    stopCamera,
    videoRef,
  }
}
