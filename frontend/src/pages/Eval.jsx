import { useState, useEffect } from 'react'

const PUNCH_COLORS = {
  jab: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  cross: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
  hook: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  uppercut: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' },
}

const fallbackStyle = { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/40' }

function PunchBadge({ type, label }) {
  const style = PUNCH_COLORS[type?.toLowerCase()] || fallbackStyle
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${style.bg} ${style.text} border ${style.border}`}>
      {label && <span className="text-gray-500 font-normal">{label}</span>}
      {type || '—'}
    </span>
  )
}

function MatchIcon({ match }) {
  if (match) {
    return <span className="text-emerald-400 text-lg" title="Match">&#10003;</span>
  }
  return <span className="text-red-400 text-lg" title="Mismatch">&#10007;</span>
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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 col-span-2 sm:col-span-1">
        <p className="text-gray-500 text-xs uppercase tracking-wider">Overall Accuracy</p>
        <p className={`text-4xl font-black mt-1 ${data.accuracy_pct >= 70 ? 'text-emerald-400' : data.accuracy_pct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
          {data.accuracy_pct}%
        </p>
        <p className="text-gray-600 text-sm mt-1">{data.total_matches}/{data.total_punches} correct</p>
      </div>
      {Object.entries(byType).map(([type, stats]) => {
        const pct = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0
        const style = PUNCH_COLORS[type] || fallbackStyle
        return (
          <div key={type} className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <p className={`text-xs uppercase tracking-wider ${style.text}`}>{type}</p>
            <p className="text-2xl font-bold text-white mt-1">{pct}%</p>
            <p className="text-gray-600 text-sm mt-1">{stats.correct}/{stats.total}</p>
          </div>
        )
      })}
    </div>
  )
}

function FrameStrip({ frames }) {
  return (
    <div className="flex gap-2 mt-3">
      {frames.map((f, i) => (
        <div key={i} className="relative group">
          <img
            src={`/api/eval/frame/${f.filename}`}
            alt={`${f.timestamp_ms}ms`}
            className="w-36 h-24 object-cover rounded-lg border border-gray-700 group-hover:border-gray-500 transition-colors"
          />
          <div className="absolute bottom-0 inset-x-0 bg-black/70 text-center text-[10px] text-gray-400 py-0.5 rounded-b-lg">
            {(f.timestamp_ms / 1000).toFixed(2)}s
          </div>
          {f.yolo_predictions.length > 0 && (
            <div className="absolute top-1 left-1">
              {f.yolo_predictions.slice(0, 2).map((pred, j) => {
                const style = PUNCH_COLORS[pred.class?.toLowerCase()] || fallbackStyle
                return (
                  <span key={j} className={`block text-[10px] px-1.5 py-0.5 rounded ${style.bg} ${style.text} mb-0.5 font-medium`}>
                    {pred.class} {(pred.confidence * 100).toFixed(0)}%
                  </span>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function PunchCard({ punch, clipIndex }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`border rounded-xl p-4 transition-colors cursor-pointer ${
        punch.match
          ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
          : 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <MatchIcon match={punch.match} />
        <span className="text-gray-500 text-sm font-mono w-8">#{punch.punch_index + 1}</span>
        <PunchBadge type={punch.ground_truth} label="GT" />
        <span className="text-gray-600">&rarr;</span>
        <PunchBadge type={punch.predicted_class} label="YOLO" />
        {punch.predicted_confidence > 0 && (
          <span className="text-gray-500 text-xs font-mono">{(punch.predicted_confidence * 100).toFixed(0)}%</span>
        )}
        <span className="text-gray-600 text-xs ml-auto font-mono">
          {(punch.start_ms / 1000).toFixed(2)}s &ndash; {(punch.end_ms / 1000).toFixed(2)}s
        </span>
      </div>
      {expanded && <FrameStrip frames={punch.frames} />}
    </div>
  )
}

function ClipSection({ clip }) {
  const matches = clip.punches.filter(p => p.match).length
  const total = clip.punches.length
  const pct = total ? Math.round((matches / total) * 100) : 0

  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-white">Clip {clip.clip_index}</h2>
        <span className="text-gray-500 text-sm">
          {(clip.clip_start_ms / 1000).toFixed(0)}s &ndash; {(clip.clip_end_ms / 1000).toFixed(0)}s
        </span>
        <span className={`ml-auto text-sm font-semibold ${pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
          {matches}/{total} ({pct}%)
        </span>
      </div>
      <div className="space-y-2">
        {clip.punches.map(p => (
          <PunchCard key={p.punch_index} punch={p} clipIndex={clip.clip_index} />
        ))}
      </div>
    </div>
  )
}

export default function Eval() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/eval/results')
      .then(r => {
        if (!r.ok) throw new Error('No eval results — run `python run_model.py` first')
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

  const filteredClips = data.clips.map(clip => ({
    ...clip,
    punches: clip.punches.filter(p => {
      if (filter === 'match') return p.match
      if (filter === 'miss') return !p.match
      return true
    }),
  })).filter(clip => clip.punches.length > 0)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Model Eval</h1>
          <p className="text-gray-500 text-sm mt-1">
            YOLO predictions vs your ground truth labels &middot; click a punch to see frames
          </p>
        </div>

        <SummaryBar data={data} />

        <div className="flex items-center gap-2 mb-6">
          {[
            { key: 'all', label: 'All' },
            { key: 'match', label: 'Matches' },
            { key: 'miss', label: 'Misses' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                filter === f.key
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="text-gray-600 text-xs ml-auto">
            conf threshold: {data.conf_threshold}
          </span>
        </div>

        {filteredClips.map(clip => (
          <ClipSection key={clip.clip_index} clip={clip} />
        ))}
      </div>
    </div>
  )
}
