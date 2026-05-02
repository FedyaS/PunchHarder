import { useState, useEffect, useRef, useCallback } from 'react'

const PUNCH_COLORS = {
  jab: '#3b82f6',
  cross: '#ef4444',
  hook: '#f59e0b',
  uppercut: '#8b5cf6',
}

function PunchOverlay({ punch, visible }) {
  if (!visible) return null
  const color = PUNCH_COLORS[punch.type] || '#6b7280'

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-punch-flash">
      <div className="text-center">
        <div className="text-6xl font-black uppercase tracking-wider" style={{ color, textShadow: `0 0 40px ${color}80` }}>
          {punch.type}
        </div>
        <div className="mt-3 flex gap-6 justify-center">
          <div className="bg-black/70 backdrop-blur rounded-lg px-4 py-2">
            <span className="text-gray-400 text-sm block">Velocity</span>
            <span className="text-white text-2xl font-bold">{punch.velocity_mps} m/s</span>
          </div>
          <div className="bg-black/70 backdrop-blur rounded-lg px-4 py-2">
            <span className="text-gray-400 text-sm block">Power</span>
            <span className="text-white text-2xl font-bold">{punch.power_score}</span>
          </div>
          <div className="bg-black/70 backdrop-blur rounded-lg px-4 py-2">
            <span className="text-gray-400 text-sm block">Confidence</span>
            <span className="text-white text-2xl font-bold">{(punch.yolo_confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PunchTimeline({ punches, currentTimeMs, clipStartMs, duration }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mt-4">
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gray-700 -translate-y-1/2" />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 z-10 transition-all duration-100"
          style={{ left: `${(currentTimeMs / duration) * 100}%` }}
        />
        {punches.map((p, i) => {
          const relTime = p.timestamp_ms - clipStartMs
          const left = (relTime / duration) * 100
          const color = PUNCH_COLORS[p.type] || '#6b7280'
          const isActive = Math.abs(currentTimeMs - relTime) < 400
          return (
            <div
              key={i}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all"
              style={{
                left: `${left}%`,
                width: isActive ? 16 : 10,
                height: isActive ? 16 : 10,
                backgroundColor: color,
                opacity: isActive ? 1 : 0.6,
                boxShadow: isActive ? `0 0 12px ${color}` : 'none',
              }}
              title={`${p.type} @ ${(relTime / 1000).toFixed(1)}s`}
            />
          )
        })}
      </div>
    </div>
  )
}

function PunchLog({ punches, currentTimeMs, clipStartMs }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mt-4 max-h-48 overflow-y-auto">
      <h3 className="text-white font-semibold text-sm mb-2">Punch Log</h3>
      <div className="space-y-1">
        {punches.map((p, i) => {
          const relTime = p.timestamp_ms - clipStartMs
          const isActive = Math.abs(currentTimeMs - relTime) < 400
          const color = PUNCH_COLORS[p.type] || '#6b7280'
          return (
            <div
              key={i}
              className={`flex items-center gap-3 text-sm px-2 py-1 rounded transition-all ${isActive ? 'bg-gray-700/80 scale-[1.02]' : 'opacity-50'}`}
            >
              <span className="text-gray-500 w-12 text-right font-mono">{(relTime / 1000).toFixed(1)}s</span>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-white font-semibold capitalize w-20">{p.type}</span>
              <span className="text-gray-400">{p.velocity_mps} m/s</span>
              <span className="text-gray-400">pwr {p.power_score}</span>
              <span className="text-gray-500">{(p.yolo_confidence * 100).toFixed(0)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ClipPlayer({ clip, index }) {
  const videoRef = useRef(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [activePunch, setActivePunch] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeedState] = useState(1)

  const clipDuration = clip.clip_end_ms - clip.clip_start_ms

  useEffect(() => {
    let url
    fetch(`/api/replay/video/${index}`)
      .then(r => r.blob())
      .then(blob => {
        url = URL.createObjectURL(blob)
        setVideoUrl(url)
      })
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [index])

  const onTimeUpdate = useCallback(() => {
    if (!videoRef.current) return
    const ms = videoRef.current.currentTime * 1000
    setCurrentTimeMs(ms)

    const hit = clip.punches.find(p => {
      const relTime = p.timestamp_ms - clip.clip_start_ms
      return Math.abs(ms - relTime) < 300
    })
    setActivePunch(hit || null)
  }, [clip])

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

  const setSpeed = (rate) => {
    if (videoRef.current) videoRef.current.playbackRate = rate
    setSpeedState(rate)
  }

  const seek = (deltaS) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + deltaS)
  }

  const onScrub = (e) => {
    if (!videoRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    videoRef.current.currentTime = (pct * clipDuration) / 1000
  }

  if (!videoUrl) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="text-gray-500 animate-pulse">Loading clip {index}...</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">
          Clip {index} <span className="text-gray-500 font-normal text-sm">({clip.clip_start_ms / 1000}s – {clip.clip_end_ms / 1000}s)</span>
        </h2>
        <span className="text-emerald-400 font-bold text-lg">{clip.punches.length} punches</span>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full"
          onTimeUpdate={onTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          preload="auto"
          playsInline
        />
        <PunchOverlay punch={activePunch} visible={!!activePunch} />
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button onClick={() => seek(-2)} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors">-2s</button>
        <button
          onClick={togglePlay}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg transition-colors"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button onClick={() => seek(2)} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors">+2s</button>
        <div className="w-px h-6 bg-gray-700 mx-1" />
        {[0.25, 0.5, 1].map(rate => (
          <button
            key={rate}
            onClick={() => setSpeed(rate)}
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
          {(currentTimeMs / 1000).toFixed(1)}s / {(clipDuration / 1000).toFixed(0)}s
        </span>
      </div>

      <div className="mt-3 h-3 bg-gray-800 rounded-full cursor-pointer relative" onClick={onScrub}>
        <div className="h-full bg-emerald-500/30 rounded-full" style={{ width: `${(currentTimeMs / clipDuration) * 100}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-400 rounded-full" style={{ left: `${(currentTimeMs / clipDuration) * 100}%` }} />
      </div>

      <PunchTimeline
        punches={clip.punches}
        currentTimeMs={currentTimeMs}
        clipStartMs={clip.clip_start_ms}
        duration={clipDuration}
      />

      <PunchLog
        punches={clip.punches}
        currentTimeMs={currentTimeMs}
        clipStartMs={clip.clip_start_ms}
      />
    </div>
  )
}

export default function Replay() {
  const [clips, setClips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/replay/clips')
      .then(r => r.json())
      .then(setClips)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg animate-pulse">Loading clips...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Punch Replay</h1>
          <p className="text-gray-500 text-sm mt-1">
            Slow-mo playback with punch detection overlay &middot; {clips.length} clips
          </p>
        </div>

        <div className="space-y-8">
          {clips.map((clip, i) => (
            <ClipPlayer key={i} clip={clip} index={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
