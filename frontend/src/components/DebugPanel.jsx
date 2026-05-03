import { useCallback, useEffect, useRef, useState } from 'react'

function useDebugEnabled() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).has('debug')
  })

  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault()
        setEnabled((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return enabled
}

function JsonBlock({ label, data }) {
  const [open, setOpen] = useState(false)
  if (data == null) return null

  return (
    <div className="border-b border-white/10 pb-2">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left font-mono text-[11px] text-green-300 hover:text-green-200"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-white/40">{open ? '▼' : '▶'}</span>
        {label}
      </button>
      {open && (
        <pre className="mt-1 max-h-[300px] overflow-auto rounded bg-black/60 p-2 font-mono text-[10px] text-gray-300 leading-relaxed">
          {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}

function ResendPanel() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const fetchSessions = useCallback(() => {
    fetch('/api/live/sessions').then((r) => r.json()).then(setSessions).catch(() => {})
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const resend = useCallback(async (sid) => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/live/session-resend/${sid}`, { method: 'POST' })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setResult({ error: e.message })
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="flex flex-col gap-2 border-t border-white/10 pt-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-bold text-yellow-400">Resend Saved Clips</span>
        <button type="button" onClick={fetchSessions} className="font-mono text-[10px] text-blue-400 hover:text-blue-300">refresh</button>
      </div>
      {sessions.length === 0 && <span className="font-mono text-[10px] text-white/40">No saved sessions</span>}
      {sessions.map((s) => (
        <button
          key={s.session_id}
          type="button"
          disabled={loading}
          className="flex items-center justify-between rounded bg-white/5 px-2 py-1.5 font-mono text-[10px] text-white/70 hover:bg-white/10 disabled:opacity-40"
          onClick={() => resend(s.session_id)}
        >
          <span>{s.session_id}</span>
          <span className="text-white/40">{s.clip_count} clips</span>
        </button>
      ))}
      {loading && <span className="font-mono text-[10px] text-yellow-300 animate-pulse">Processing...</span>}
      {result && <JsonBlock label="Resend result" data={result} />}
    </div>
  )
}

export function DebugPanel({ phase, sessionId, clipIndex, metrics, sessionResults, sessionError }) {
  const enabled = useDebugEnabled()
  const [collapsed, setCollapsed] = useState(false)

  if (!enabled) return null

  const clips = sessionResults?.clips ?? []

  return (
    <div className="fixed bottom-0 right-0 z-[9999] max-h-[70vh] w-[420px] overflow-y-auto rounded-tl-xl border-l border-t border-white/10 bg-gray-950/95 text-white shadow-2xl backdrop-blur-md">
      <div
        className="sticky top-0 z-10 flex cursor-pointer items-center justify-between bg-gray-900/95 px-3 py-2 backdrop-blur"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className="font-mono text-xs font-bold text-green-400">DEBUG PANEL</span>
        <span className="font-mono text-[10px] text-white/40">{collapsed ? '▲ expand' : '▼ collapse'} · Ctrl+D to toggle</span>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-2 p-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
            <span className="text-white/50">Phase</span>
            <span className="text-yellow-300">{phase}</span>
            <span className="text-white/50">Session ID</span>
            <span className="text-blue-300 truncate">{sessionId || '—'}</span>
            <span className="text-white/50">Clip Index</span>
            <span>{clipIndex}</span>
            <span className="text-white/50">Punch Count</span>
            <span className="text-primary">{metrics?.punchCount ?? 0}</span>
            <span className="text-white/50">Pose Count</span>
            <span>{metrics?.poseCount ?? 0}</span>
            <span className="text-white/50">Camera</span>
            <span>{metrics?.isLive ? '🟢 live' : '⚫ off'}</span>
            <span className="text-white/50">Tracking</span>
            <span>{metrics?.trackingStatus ?? 'idle'}</span>
          </div>

          {sessionError && (
            <div className="rounded bg-red-900/40 px-2 py-1 font-mono text-[10px] text-red-300">
              Error: {sessionError}
            </div>
          )}

          {clips.length > 0 && (
            <div className="mt-1 flex flex-col gap-2">
              <span className="font-mono text-[11px] font-bold text-green-400">Clip Results ({clips.length})</span>
              {clips.map((clip, i) => (
                <div key={i} className="flex flex-col gap-1 rounded border border-white/5 bg-white/5 p-2">
                  <span className="font-mono text-[11px] text-white/70">
                    Clip {clip.clip_index ?? i}
                    {clip.mock_mode && <span className="ml-2 text-yellow-500">[MOCK]</span>}
                    {clip.error && <span className="ml-2 text-red-400">[ERROR]</span>}
                  </span>
                  {clip.timings && (
                    <div className="font-mono text-[10px] text-white/40">
                      ffmpeg: {clip.timings.ffmpeg_s}s · yolo: {clip.timings.yolo_s}s · nemotron: {clip.timings.nemotron_s}s · tts: {clip.timings.tts_s}s
                    </div>
                  )}
                  <JsonBlock label={`classified_labels (${clip.classified_labels?.punches?.length ?? 0} punches)`} data={clip.classified_labels} />
                  <JsonBlock label={`coaching_sections (${clip.coaching_sections?.length ?? 0})`} data={clip.coaching_sections} />
                  <JsonBlock label="coaching_raw_markdown" data={clip.coaching_raw_markdown} />
                  {clip.error && <JsonBlock label="error" data={clip.error} />}
                </div>
              ))}
            </div>
          )}

          <JsonBlock label="Full metrics" data={metrics} />
          <JsonBlock label="Full sessionResults" data={sessionResults} />

          <ResendPanel />
        </div>
      )}
    </div>
  )
}
