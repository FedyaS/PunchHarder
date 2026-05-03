import { useState, useEffect } from 'react'

const PUNCH_COLORS = {
  jab: '#3b82f6',
  cross: '#ef4444',
  hook: '#f59e0b',
  uppercut: '#8b5cf6',
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
      <p className="text-gray-400 text-sm uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-gray-500 text-sm mt-1">{sub}</p>}
    </div>
  )
}

function PunchTypeCard({ type, stats }) {
  const color = PUNCH_COLORS[type] || '#6b7280'
  const pct = Math.round(stats.avg_power)

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-white font-semibold capitalize text-lg">{type}</span>
        <span className="text-gray-400 ml-auto text-2xl font-bold">{stats.count}x</span>
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Avg Power</span>
            <span className="text-white">{stats.avg_power}</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Max Power</span>
          <span className="text-white">{stats.max_power}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Avg Velocity</span>
          <span className="text-white">{stats.avg_velocity}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Max Velocity</span>
          <span className="text-white">{stats.max_velocity}</span>
        </div>
      </div>
    </div>
  )
}

function Timeline({ punches, totalDuration }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">Punch Timeline</h3>
      <div className="relative h-16">
        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gray-700 -translate-y-1/2" />
        {[0, 10000, 20000, 30000].map((ms) => (
          <div key={ms} className="absolute top-full mt-1 text-xs text-gray-500 -translate-x-1/2" style={{ left: `${(ms / totalDuration) * 100}%` }}>
            {ms / 1000}s
          </div>
        ))}
        {punches.map((p, i) => {
          const left = (p.timestamp_ms / totalDuration) * 100
          const color = PUNCH_COLORS[p.type] || '#6b7280'
          const size = 12 + (p.estimated_power / 100) * 20
          return (
            <div
              key={i}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer opacity-85 hover:opacity-100 hover:scale-125 transition-all"
              style={{ left: `${left}%`, width: size, height: size, backgroundColor: color }}
              title={`${p.type} @ ${(p.timestamp_ms / 1000).toFixed(1)}s — power: ${p.estimated_power}, velocity: ${p.estimated_velocity}`}
            />
          )
        })}
      </div>
      <div className="flex gap-4 mt-8 justify-center">
        {Object.entries(PUNCH_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-sm text-gray-400">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ClipCard({ clip }) {
  const notes = clip.analysis?.form_notes
  const punches = clip.analysis?.punches || []
  const hasError = clip.analysis?.parse_error

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">
          Clip {clip.clip_index} <span className="text-gray-500 font-normal text-sm">({clip.clip_start_ms / 1000}s – {clip.clip_end_ms / 1000}s)</span>
        </h3>
        <span className="text-gray-500 text-sm">{clip.response_time_s}s response</span>
      </div>

      {hasError ? (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
          Parse error — response was truncated. Try increasing max_tokens.
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-3 flex-wrap">
            {punches.map((p, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: `${PUNCH_COLORS[p.type] || '#6b7280'}25`, color: PUNCH_COLORS[p.type] || '#6b7280' }}>
                {p.type} @ {((p.timestamp_ms % 10000) / 1000).toFixed(1)}s
              </span>
            ))}
          </div>
          {notes && (
            <div className="space-y-2 text-sm">
              <div className="flex gap-4">
                <span className="text-gray-400">Guard: <span className="text-white">{(notes.guard_discipline * 100).toFixed(0)}%</span></span>
                <span className="text-gray-400">Rhythm: <span className="text-white">{(notes.rhythm_consistency * 100).toFixed(0)}%</span></span>
              </div>
              <p className="text-gray-300 italic">"{notes.observations}"</p>
            </div>
          )}
        </>
      )}

      <div className="mt-3 text-xs text-gray-600">
        Tokens: {clip.tokens.total_tokens}
      </div>
    </div>
  )
}

function RunPicker({ runs, activeRun, onSelect }) {
  if (runs.length <= 1) return null

  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      {runs.map(run => (
        <button
          key={run.run_id}
          onClick={() => onSelect(run.run_id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeRun === run.run_id
              ? 'bg-emerald-500 text-black'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
          }`}
        >
          {run.run_id === 'default' ? 'Run 1' : run.run_id.replace('run_', '')}
          <span className="ml-2 opacity-60">{run.total_punches}p</span>
        </button>
      ))}
    </div>
  )
}

export default function Analysis() {
  const [runs, setRuns] = useState([])
  const [activeRun, setActiveRun] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analysis/runs')
      .then(r => r.json())
      .then(runList => {
        setRuns(runList)
        if (runList.length > 0) {
          setActiveRun(runList[runList.length - 1].run_id)
        } else {
          setError('No analysis runs found')
          setLoading(false)
        }
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!activeRun) return
    setLoading(true)
    fetch(`/api/analysis/${activeRun}`)
      .then(r => {
        if (!r.ok) throw new Error('Run not found')
        return r.json()
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [activeRun])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg animate-pulse">Loading analysis...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      </div>
    )
  }

  const { punch_summary, all_punches_combined, clips, total_tokens, total_response_time_s } = data
  const avgPower = all_punches_combined.length
    ? (all_punches_combined.reduce((s, p) => s + (p.estimated_power || 0), 0) / all_punches_combined.length).toFixed(1)
    : 0
  const avgVelocity = all_punches_combined.length
    ? (all_punches_combined.reduce((s, p) => s + (p.estimated_velocity || 0), 0) / all_punches_combined.length).toFixed(1)
    : 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <RunPicker runs={runs} activeRun={activeRun} onSelect={setActiveRun} />

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Round Analysis</h1>
            <p className="text-gray-500 text-sm mt-1">
              {data.total_duration_ms / 1000}s session &middot; {clips.length} clips &middot; {total_response_time_s}s API time &middot; {total_tokens.total_tokens} tokens
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-black text-emerald-400">{punch_summary.total}</div>
            <div className="text-gray-400 text-sm">total punches</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Avg Power" value={avgPower} sub="out of 100" />
          <StatCard label="Avg Velocity" value={avgVelocity} sub="out of 100" />
          <StatCard label="Punch Types" value={Object.keys(punch_summary.by_type).length} sub={Object.keys(punch_summary.by_type).join(', ')} />
        </div>

        <div className="mb-8">
          <Timeline punches={all_punches_combined} totalDuration={data.total_duration_ms} />
        </div>

        <h2 className="text-xl font-semibold mb-4">By Punch Type</h2>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {Object.entries(punch_summary.by_type).map(([type, stats]) => (
            <PunchTypeCard key={type} type={type} stats={stats} />
          ))}
        </div>

        <h2 className="text-xl font-semibold mb-4">Clip Breakdown</h2>
        <div className="space-y-4">
          {clips.map(clip => (
            <ClipCard key={clip.clip_index} clip={clip} />
          ))}
        </div>
      </div>
    </div>
  )
}
