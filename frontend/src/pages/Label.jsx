import { useState, useEffect, useRef, useCallback } from 'react'

const API = ''

export default function Label() {
  const videoRef = useRef(null)
  const [clipIndex, setClipIndex] = useState(0)
  const [videoUrl, setVideoUrl] = useState(null)
  const [currentMs, setCurrentMs] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(0.25)
  const [punches, setPunches] = useState([])
  const [pendingStart, setPendingStart] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let url
    fetch(`${API}/api/replay/video/${clipIndex}`)
      .then(r => r.blob())
      .then(blob => {
        url = URL.createObjectURL(blob)
        setVideoUrl(url)
      })
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [clipIndex])

  useEffect(() => {
    setPunches([])
    setPendingStart(null)
    setSaved(false)
  }, [clipIndex])

  const onTimeUpdate = useCallback(() => {
    if (!videoRef.current) return
    setCurrentMs(videoRef.current.currentTime * 1000)
  }, [])

  const onLoaded = useCallback(() => {
    if (!videoRef.current) return
    setDuration(videoRef.current.duration * 1000)
    videoRef.current.playbackRate = speed
  }, [speed])

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if (e.code === 'Space') {
        e.preventDefault()
        if (!videoRef.current) return
        const ms = Math.round(videoRef.current.currentTime * 1000)

        if (pendingStart === null) {
          setPendingStart(ms)
        } else {
          setPunches(prev => [...prev, { type: '', start_ms: pendingStart, end_ms: ms }])
          setPendingStart(null)
          setSaved(false)
        }
      }

      if (e.code === 'KeyZ' && !e.ctrlKey) {
        e.preventDefault()
        if (pendingStart !== null) {
          setPendingStart(null)
        } else {
          setPunches(prev => prev.slice(0, -1))
          setSaved(false)
        }
      }

      if (e.code === 'KeyK') {
        e.preventDefault()
        if (!videoRef.current) return
        if (videoRef.current.paused) videoRef.current.play()
        else videoRef.current.pause()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pendingStart])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play()
      setPlaying(true)
    } else {
      videoRef.current.pause()
      setPlaying(false)
    }
  }

  const changeSpeed = (rate) => {
    if (videoRef.current) videoRef.current.playbackRate = rate
    setSpeed(rate)
  }

  const seek = (deltaS) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + deltaS)
  }

  const onScrub = (e) => {
    if (!videoRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    videoRef.current.currentTime = (pct * duration) / 1000
  }

  const saveLabels = async () => {
    setSaving(true)
    const payload = {
      clip_index: clipIndex,
      clip_start_ms: 0,
      clip_end_ms: Math.round(duration),
      punches,
    }
    try {
      const res = await fetch(`${API}/api/label/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Punch Labeler</h1>
          <p className="text-gray-500 text-sm mt-1">
            Watch in slow-mo. <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">Space</kbd> for punch start, <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">Space</kbd> again for punch end. <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">Z</kbd> to undo. <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">K</kbd> play/pause.
          </p>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {[0, 1, 2].map(i => (
            <button
              key={i}
              onClick={() => setClipIndex(i)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                clipIndex === i
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
              }`}
            >
              Clip {i}
            </button>
          ))}
        </div>

        {videoUrl && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full"
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoaded}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                preload="auto"
                playsInline
              />
              {pendingStart !== null && (
                <div className="absolute top-4 right-4 bg-yellow-500/90 text-black px-3 py-1.5 rounded-lg text-sm font-bold animate-pulse">
                  Punch started @ {(pendingStart / 1000).toFixed(2)}s — press Space for end
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => seek(-0.5)} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors">-0.5s</button>
              <button onClick={() => seek(-0.1)} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors">-0.1s</button>
              <button
                onClick={togglePlay}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg transition-colors"
              >
                {playing ? 'Pause' : 'Play'}
              </button>
              <button onClick={() => seek(0.1)} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors">+0.1s</button>
              <button onClick={() => seek(0.5)} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors">+0.5s</button>
              <div className="w-px h-6 bg-gray-700 mx-1" />
              {[0.1, 0.25, 0.5, 1].map(rate => (
                <button
                  key={rate}
                  onClick={() => changeSpeed(rate)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    speed === rate
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
                  }`}
                >
                  {rate}x
                </button>
              ))}
              <span className="text-gray-500 text-sm ml-auto font-mono">
                {(currentMs / 1000).toFixed(2)}s / {(duration / 1000).toFixed(1)}s
              </span>
            </div>

            {/* Scrubber */}
            <div className="mt-3 h-3 bg-gray-800 rounded-full cursor-pointer relative" onClick={onScrub}>
              <div className="h-full bg-emerald-500/30 rounded-full" style={{ width: `${duration ? (currentMs / duration) * 100 : 0}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-400 rounded-full" style={{ left: `${duration ? (currentMs / duration) * 100 : 0}%` }} />
              {punches.map((p, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 bg-blue-500/30 rounded-sm"
                  style={{
                    left: `${(p.start_ms / duration) * 100}%`,
                    width: `${((p.end_ms - p.start_ms) / duration) * 100}%`,
                  }}
                />
              ))}
            </div>

            {/* Punch list */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Labeled Punches ({punches.length})</h3>
                <button
                  onClick={saveLabels}
                  disabled={saving || punches.length === 0}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    saved
                      ? 'bg-green-600 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {saving ? 'Saving...' : saved ? 'Saved' : 'Save Labels'}
                </button>
              </div>

              {punches.length === 0 && !pendingStart && (
                <p className="text-gray-600 text-sm">No punches labeled yet. Play the video and press Space when a punch starts.</p>
              )}

              <div className="space-y-1">
                {punches.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <span className="text-gray-500 w-6 text-right font-mono">{i + 1}</span>
                    <span className="text-blue-400 font-mono w-28">
                      {(p.start_ms / 1000).toFixed(2)}s → {(p.end_ms / 1000).toFixed(2)}s
                    </span>
                    <span className="text-gray-500 font-mono w-16">
                      {(p.end_ms - p.start_ms)}ms
                    </span>
                    <span className="text-gray-600 italic">{p.type || 'unlabeled'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
