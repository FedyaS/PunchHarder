import { useState, useEffect, useRef, useCallback } from 'react'

const API = ''
const PUNCH_TYPES = ['jab', 'cross', 'hook', 'uppercut']
const TYPE_KEYS = { '1': 'jab', '2': 'cross', '3': 'hook', '4': 'uppercut' }
const TYPE_COLORS = {
  jab: 'bg-blue-500',
  cross: 'bg-red-500',
  hook: 'bg-amber-500',
  uppercut: 'bg-purple-500',
}

export default function Classify() {
  const videoRef = useRef(null)
  const [clipIndex, setClipIndex] = useState(0)
  const [videoUrl, setVideoUrl] = useState(null)
  const [labels, setLabels] = useState(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(0.25)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [looping, setLooping] = useState(true)

  const punches = labels?.punches || []
  const current = punches[currentIdx]

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
    fetch(`${API}/api/label/load/${clipIndex}`)
      .then(r => {
        if (!r.ok) throw new Error('No labels')
        return r.json()
      })
      .then(data => {
        setLabels(data)
        setCurrentIdx(0)
        setSaved(false)
      })
      .catch(() => setLabels(null))
  }, [clipIndex])

  const seekToPunch = useCallback((idx) => {
    if (!videoRef.current || !punches[idx]) return
    const p = punches[idx]
    const padded = Math.max(0, p.start_ms - 300)
    videoRef.current.currentTime = padded / 1000
  }, [punches])

  useEffect(() => {
    seekToPunch(currentIdx)
  }, [currentIdx, seekToPunch])

  const onTimeUpdate = useCallback(() => {
    if (!videoRef.current || !current || !looping) return
    const ms = videoRef.current.currentTime * 1000
    if (ms > current.end_ms + 500) {
      const padded = Math.max(0, current.start_ms - 300)
      videoRef.current.currentTime = padded / 1000
    }
  }, [current, looping])

  const onLoaded = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.playbackRate = speed
    seekToPunch(currentIdx)
  }, [speed, currentIdx, seekToPunch])

  const assignType = useCallback((type) => {
    if (!labels) return
    const updated = { ...labels, punches: labels.punches.map((p, i) =>
      i === currentIdx ? { ...p, type } : p
    )}
    setLabels(updated)
    setSaved(false)
    if (currentIdx < punches.length - 1) {
      setCurrentIdx(prev => prev + 1)
    }
  }, [labels, currentIdx, punches.length])

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if (TYPE_KEYS[e.key]) {
        e.preventDefault()
        assignType(TYPE_KEYS[e.key])
      }

      if (e.code === 'ArrowRight') {
        e.preventDefault()
        setCurrentIdx(prev => Math.min(prev + 1, punches.length - 1))
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault()
        setCurrentIdx(prev => Math.max(prev - 1, 0))
      }
      if (e.code === 'Space') {
        e.preventDefault()
        if (!videoRef.current) return
        if (videoRef.current.paused) videoRef.current.play()
        else videoRef.current.pause()
      }
      if (e.code === 'KeyR') {
        e.preventDefault()
        seekToPunch(currentIdx)
        if (videoRef.current?.paused) videoRef.current.play()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [assignType, punches.length, currentIdx, seekToPunch])

  const changeSpeed = (rate) => {
    if (videoRef.current) videoRef.current.playbackRate = rate
    setSpeed(rate)
  }

  const saveLabels = async () => {
    if (!labels) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/label/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(labels),
      })
      if (res.ok) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const classified = punches.filter(p => p.type).length
  const progress = punches.length ? Math.round((classified / punches.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Classify Punches</h1>
          <p className="text-gray-500 text-sm mt-1">
            Loops each punch. Press
            {PUNCH_TYPES.map((t, i) => (
              <span key={t}> <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">{i + 1}</kbd>={t}</span>
            ))}
            . <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">← →</kbd> navigate. <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">R</kbd> replay. <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">Space</kbd> play/pause.
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

        {!labels && (
          <div className="text-gray-500 text-center py-20">
            No labels found for clip {clipIndex}. Label timestamps first on the Label page.
          </div>
        )}

        {labels && videoUrl && (
          <div className="grid grid-cols-[1fr,320px] gap-6">
            {/* Video */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-400">
                  Punch <span className="text-white font-bold text-lg">{currentIdx + 1}</span> / {punches.length}
                  {current && (
                    <span className="ml-3 text-gray-500 font-mono">
                      {(current.start_ms / 1000).toFixed(2)}s → {(current.end_ms / 1000).toFixed(2)}s
                      <span className="ml-2 text-gray-600">({current.end_ms - current.start_ms}ms)</span>
                    </span>
                  )}
                </div>
                {current?.type && (
                  <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${TYPE_COLORS[current.type] || 'bg-gray-600'}`}>
                    {current.type}
                  </span>
                )}
              </div>

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
                  autoPlay
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => setCurrentIdx(prev => Math.max(prev - 1, 0))}
                  disabled={currentIdx === 0}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors disabled:opacity-30"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => { seekToPunch(currentIdx); if (videoRef.current?.paused) videoRef.current.play() }}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors"
                >
                  Replay
                </button>
                <button
                  onClick={() => setCurrentIdx(prev => Math.min(prev + 1, punches.length - 1))}
                  disabled={currentIdx === punches.length - 1}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors disabled:opacity-30"
                >
                  Next →
                </button>
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
                <div className="w-px h-6 bg-gray-700 mx-1" />
                <button
                  onClick={() => setLooping(l => !l)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    looping
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-gray-800 text-gray-300 border-gray-700'
                  }`}
                >
                  Loop
                </button>
              </div>

              {/* Type buttons */}
              <div className="flex gap-2 mt-4">
                {PUNCH_TYPES.map((t, i) => (
                  <button
                    key={t}
                    onClick={() => assignType(t)}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm uppercase tracking-wider border-2 transition-all ${
                      current?.type === t
                        ? `${TYPE_COLORS[t]} border-white text-white scale-105`
                        : `bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500`
                    }`}
                  >
                    <span className="text-gray-500 mr-1">{i + 1}</span> {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Punch list sidebar */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 h-fit max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">All Punches</h3>
                <span className="text-xs text-gray-500">{classified}/{punches.length}</span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-gray-800 rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
              </div>

              <div className="space-y-1 overflow-y-auto flex-1">
                {punches.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className={`w-full flex items-center gap-2 text-sm px-2.5 py-1.5 rounded-lg transition-all text-left ${
                      i === currentIdx
                        ? 'bg-gray-700 ring-1 ring-emerald-500'
                        : 'hover:bg-gray-800/50'
                    }`}
                  >
                    <span className="text-gray-600 w-5 text-right font-mono text-xs">{i + 1}</span>
                    <span className="text-gray-400 font-mono text-xs w-24">
                      {(p.start_ms / 1000).toFixed(2)}s→{(p.end_ms / 1000).toFixed(2)}s
                    </span>
                    {p.type ? (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${TYPE_COLORS[p.type]}`}>
                        {p.type}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-xs italic">—</span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={saveLabels}
                disabled={saving || classified === 0}
                className={`w-full mt-3 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                  saved
                    ? 'bg-green-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {saving ? 'Saving...' : saved ? 'Saved' : `Save (${classified}/${punches.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
