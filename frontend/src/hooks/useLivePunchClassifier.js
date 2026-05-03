import { useCallback, useState } from 'react'

function extensionForBlob(blob) {
  if (blob.type.includes('mp4')) return 'mp4'
  return 'webm'
}

export function useLivePunchClassifier() {
  const [error, setError] = useState('')
  const [lastResult, setLastResult] = useState(null)
  const [status, setStatus] = useState('idle')

  const classifyClip = useCallback(async ({ filename, labels, videoBlob }) => {
    if (!videoBlob) {
      throw new Error('Missing video clip for punch classification.')
    }
    if (!labels) {
      throw new Error('Missing punch labels for punch classification.')
    }

    setError('')
    setStatus('uploading')

    const clipIndex = labels.clip_index ?? 0
    const formData = new FormData()
    formData.append('video', videoBlob, filename || `clip_${clipIndex}.${extensionForBlob(videoBlob)}`)
    formData.append('labels', JSON.stringify(labels))

    try {
      const response = await fetch('/api/live/classify', {
        method: 'POST',
        body: formData,
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Live punch classification failed.')
      }

      setLastResult(payload)
      setStatus('complete')
      return payload
    } catch (err) {
      setError(err?.message || 'Live punch classification failed.')
      setStatus('error')
      throw err
    }
  }, [])

  return {
    classifyClip,
    error,
    lastResult,
    status,
  }
}
