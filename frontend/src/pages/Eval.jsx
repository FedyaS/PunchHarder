import { useState, useEffect, useRef, useCallback } from 'react'

const PUNCH_COLORS = {
  jab: { hex: '#3b82f6', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  cross: { hex: '#ef4444', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
  hook: { hex: '#f59e0b', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  uppercut: { hex: '#8b5cf6', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' },
}

const fallbackColor = { hex: '#6b7280', bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/40' }

function PunchBadge({ type, label, large }) {
  const style = PUNCH_COLORS[type?.toLowerCase()] || fallbackColor
  const size = large ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs'
  return (
    <span className={`inline-flex items-center gap-1.5 ${size} rounded-lg font-semibold ${style.bg} ${style.text} border ${style.border}`}>
      {label && <span className="text-gray-500 font-normal text-[10px] uppercase">{label}</span>}
      <span className="capitalize">{type || '—'}</span>
    </span>
  )
}

function SummaryBar({ data }) {
  const byType = {}
  for (const clip of data.clips) {
    for (const p of clip.punches) {
      const gt = p.ground_truth.toLowerCase()
      if (!byType[gt]) byType[gt] = { total: 0, correct: 0 }
      byType[gt].total++
      if (p.match) byType[gt].correct++
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 col-span-2 sm:col-span-1">
        <p className="text-gray-500 text-[10px] uppercase tracking-wider">Accuracy</p>
        <p className={`text-3xl font-black mt-1 ${data.accuracy_pct >= 70 ? 'text-emerald-400' : data.accuracy_pct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
          {data.accuracy_pct}%
        </p>
        <p className="text-gray-600 text-xs mt-1">{data.total_matches}/{data.total_punches}</p>
      </div>
      {Object.entries(byType).map(([type, stats]) => {
        const pct = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0
        const style = PUNCH_COLORS[type] || fallbackColor
        return (
          <div key={type} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
            <p className={`text-[10px] uppercase tracking-wider ${style.text}`}>{type}</p>
            <p className="text-xl font-bold text-white mt-1">{pct}%</p>
            <p className="text-gray-600 text-xs mt-1">{stats.correct}/{stats.total}</p>
          </div>
        )
      })}
    </div>
  )
}

function FrameStepper({ punch }) {
  const [idx, setIdx] = useState(0)
  const frames = punch.frames || []

  useEffect(() => { setIdx(0) }, [punch.punch_index])

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.code === 'ArrowLeft') { e.preventDefault(); setIdx(i => Math.max(0, i - 1)) }
      if (e.code === 'ArrowRight') { e.preventDefault(); setIdx(i => Math.min(frames.length - 1, i + 1)) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [frames.length])

  if (!frames.length) {
    return <p className="text-gray-600 text-sm ml-10 mt-2 mb-2">No frames extracted</p>
  }

  const f = frames[idx]
  const bestPred = f.yolo_predictions.filter(p => !['bag', 'no punch', 'no_punch'].includes(p.class?.toLowerCase()))
    .sort((a, b) => b.confidence - a.confidence)[0]

  return (
    <div className="ml-10 mt-3 mb-3 bg-gray-900/60 border border-gray-800 rounded-xl p-4">
      <div className="flex gap-5">
        {/* Frame image */}
        <div className="relative flex-shrink-0">
          <img
            src={`/api/eval/frame/${f.filename}`}
            alt={`${f.timestamp_ms}ms`}
            className="w-72 h-48 object-cover rounded-lg border border-gray-700"
          />
          {f.yolo_predictions.length > 0 && (
            <div className="absolute top-2 left-2">
              {f.yolo_predictions.map((pred, j) => {
                const style = PUNCH_COLORS[pred.class?.toLowerCase()] || fallbackColor
                return (
                  <span key={j} className={`block text-xs px-2 py-0.5 rounded ${style.bg} ${style.text} mb-1 font-semibold`}>
                    {pred.class} {(pred.confidence * 100).toFixed(0)}%
                  </span>
                )
              })}
            </div>
          )}
          {f.yolo_predictions.length === 0 && (
            <div className="absolute top-2 left-2">
              <span className="block text-xs px-2 py-0.5 rounded bg-gray-700/80 text-gray-400 font-medium">
                no detection
              </span>
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="flex-1 min-w-0">
          <div className="text-gray-500 text-xs font-mono mb-3">
            {(f.timestamp_ms / 1000).toFixed(3)}s
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Your Label</div>
              <PunchBadge type={punch.ground_truth} large />
            </div>
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">YOLO Says</div>
              {bestPred ? (
                <div className="flex items-center gap-2">
                  <PunchBadge type={bestPred.class} large />
                  <span className="text-gray-500 text-sm font-mono">{(bestPred.confidence * 100).toFixed(0)}%</span>
                </div>
              ) : (
                <span className="text-gray-600 text-sm italic">nothing detected</span>
              )}
            </div>
          </div>

          {bestPred && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${
              bestPred.class.toLowerCase() === punch.ground_truth.toLowerCase()
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {bestPred.class.toLowerCase() === punch.ground_truth.toLowerCase() ? '\u2713 Match' : '\u2717 Mismatch'}
            </div>
          )}

          {f.yolo_predictions.length > 1 && (
            <div className="mt-3">
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">All detections</div>
              <div className="space-y-0.5">
                {f.yolo_predictions.map((pred, j) => (
                  <div key={j} className="text-xs text-gray-400 font-mono">
                    {pred.class} &middot; {(pred.confidence * 100).toFixed(1)}%
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stepper controls */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-800">
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          &larr; Prev
        </button>
        <div className="flex-1 flex items-center gap-1">
          {frames.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-2 rounded-full transition-all ${
                i === idx ? 'w-4 bg-emerald-400' : 'w-2 bg-gray-700 hover:bg-gray-600'
              }`}
            />
          ))}
        </div>
        <span className="text-gray-600 text-xs font-mono">{idx + 1}/{frames.length}</span>
        <button
          onClick={() => setIdx(i => Math.min(frames.length - 1, i + 1))}
          disabled={idx === frames.length - 1}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next &rarr;
        </button>
      </div>
      <p className="text-gray-700 text-[10px] mt-2 text-center">Arrow keys: &larr; &rarr;</p>
    </div>
  )
}

function EvalClipPlayer({ clip, clipIndex }) {
  const videoRef = useRef(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [currentMs, setCurrentMs] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeedState] = useState(0.5)
  const [activePunch, setActivePunch] = useState(null)
  const [expandedPunch, setExpandedPunch] = useState(null)

  const clipDuration = clip.clip_end_ms - clip.clip_start_ms

  useEffect(() => {
    let url
    fetch(`/api/replay/video/${clipIndex}`)
      .then(r => r.blob())
      .then(blob => {
        url = URL.createObjectURL(blob)
        setVideoUrl(url)
      })
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [clipIndex])

  const onTimeUpdate = useCallback(() => {
    if (!videoRef.current) return
    const ms = videoRef.current.currentTime * 1000

    setCurrentMs(ms)

    const hit = clip.punches.find(p => ms >= p.start_ms && ms <= p.end_ms)
    setActivePunch(hit || null)
  }, [clip.punches])

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

  const onLoaded = useCallback(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [speed])

  const seek = (deltaS) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + deltaS)
  }

  const seekToPunch = (punch) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = punch.start_ms / 1000
    setExpandedPunch(expandedPunch === punch.punch_index ? null : punch.punch_index)
  }

  const onScrub = (e) => {
    if (!videoRef.current || !clipDuration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    videoRef.current.currentTime = (pct * clipDuration) / 1000
  }

  const matches = clip.punches.filter(p => p.match).length
  const total = clip.punches.length
  const pct = total ? Math.round((matches / total) * 100) : 0

  if (!videoUrl) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="text-gray-500 animate-pulse">Loading clip {clipIndex}...</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">
          Clip {clipIndex} <span className="text-gray-500 font-normal text-sm">({clip.clip_start_ms / 1000}s – {clip.clip_end_ms / 1000}s)</span>
        </h2>
        <span className={`font-bold text-lg ${pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
          {matches}/{total} ({pct}%)
        </span>
      </div>

      {/* Video */}
      <div className="relative rounded-xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full"
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoaded}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          preload="auto"
          playsInline
        />

        {/* Active punch overlay */}
        {activePunch && (
          <div className="absolute top-0 left-0 right-0 pointer-events-none flex justify-between items-start p-3">
            <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-700">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Ground Truth</div>
              <PunchBadge type={activePunch.ground_truth} large />
            </div>
            <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-700">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">YOLO</div>
              <PunchBadge type={activePunch.predicted_class} large />
              {activePunch.predicted_confidence > 0 && (
                <span className="text-gray-400 text-xs ml-1.5">{(activePunch.predicted_confidence * 100).toFixed(0)}%</span>
              )}
            </div>
            <div className={`rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold ${activePunch.match ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
              {activePunch.match ? '\u2713' : '\u2717'}
            </div>
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
          {(currentMs / 1000).toFixed(2)}s / {(clipDuration / 1000).toFixed(1)}s
        </span>
      </div>

      {/* Scrubber with punch windows */}
      <div className="mt-3 h-4 bg-gray-800 rounded-full cursor-pointer relative" onClick={onScrub}>
        <div className="h-full bg-emerald-500/20 rounded-full" style={{ width: `${clipDuration ? (currentMs / clipDuration) * 100 : 0}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-400 rounded-full z-10" style={{ left: `${clipDuration ? (currentMs / clipDuration) * 100 : 0}%` }} />
        {clip.punches.map((p, i) => {
          const color = p.match
            ? (PUNCH_COLORS[p.ground_truth?.toLowerCase()] || fallbackColor).hex
            : '#ef4444'
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 rounded-sm opacity-40 hover:opacity-70 transition-opacity"
              style={{
                left: `${(p.start_ms / clipDuration) * 100}%`,
                width: `${Math.max(0.5, ((p.end_ms - p.start_ms) / clipDuration) * 100)}%`,
                backgroundColor: color,
              }}
              title={`${p.ground_truth} → ${p.predicted_class || '?'} (${p.match ? 'match' : 'miss'})`}
            />
          )
        })}
      </div>

      {/* Punch comparison log */}
      <div className="mt-5">
        <h3 className="text-white font-semibold text-sm mb-3">Punch Comparison</h3>
        <div className="space-y-1.5">
          {clip.punches.map((p) => {
            const isActive = activePunch && activePunch.punch_index === p.punch_index
            const isExpanded = expandedPunch === p.punch_index
            return (
              <div key={p.punch_index}>
                <div
                  onClick={() => seekToPunch(p)}
                  className={`flex items-center gap-3 text-sm px-3 py-2 rounded-lg cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-gray-700/80 border-gray-600 scale-[1.01]'
                      : 'bg-gray-800/40 border-transparent hover:bg-gray-800/70 hover:border-gray-700'
                  }`}
                >
                  <span className={`text-lg ${p.match ? 'text-emerald-400' : 'text-red-400'}`}>
                    {p.match ? '\u2713' : '\u2717'}
                  </span>
                  <span className="text-gray-500 font-mono w-6 text-right text-xs">{p.punch_index + 1}</span>
                  <span className="text-gray-500 font-mono text-xs w-24">
                    {(p.start_ms / 1000).toFixed(2)}–{(p.end_ms / 1000).toFixed(2)}s
                  </span>
                  <PunchBadge type={p.ground_truth} label="GT" />
                  <span className="text-gray-600">&rarr;</span>
                  <PunchBadge type={p.predicted_class} label="YOLO" />
                  {p.predicted_confidence > 0 && (
                    <span className="text-gray-500 text-xs font-mono">{(p.predicted_confidence * 100).toFixed(0)}%</span>
                  )}
                  {p.num_frames_analyzed != null && (
                    <span className="text-gray-700 text-xs ml-auto">{p.num_frames_analyzed}f</span>
                  )}
                </div>

                {isExpanded && <FrameStepper punch={p} />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Eval() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/eval/results')
      .then(r => {
        if (!r.ok) throw new Error('No eval results \u2014 run `python run_model.py` first')
        return r.json()
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg animate-pulse">Loading eval results...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-2">{error}</p>
          <p className="text-gray-500 text-sm">Run <code className="bg-gray-800 px-2 py-1 rounded text-gray-300">python run_model.py</code> from the backend folder.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Model Eval</h1>
          <p className="text-gray-500 text-sm mt-1">
            Play each clip and see YOLO vs your labels in real time
          </p>
        </div>

        <SummaryBar data={data} />

        {data.clips.map(clip => (
          <EvalClipPlayer key={clip.clip_index} clip={clip} clipIndex={clip.clip_index} />
        ))}
      </div>
    </div>
  )
}
