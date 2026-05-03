import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

const PUNCH_COLORS = {
  jab: '#3b82f6',
  cross: '#ef4444',
  hook: '#f59e0b',
  uppercut: '#8b5cf6',
}

/** Normalize nbsp, narrow nbsp, unicode hyphens for ms range parsing */
function normalizeCoachingText(raw) {
  return raw
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
}

function splitCoachingSections(text) {
  const norm = normalizeCoachingText(text).trim()
  if (!norm) return []
  if (!/^#+\s/m.test(norm)) {
    return [{ heading: 'Coaching', body: norm }]
  }
  const lines = norm.split(/\r?\n/)
  const sections = []
  let current = null
  for (const line of lines) {
    const m = line.match(/^#+\s*(.+)$/)
    if (m) {
      if (current) sections.push(current)
      current = { heading: m[1].trim(), bodyLines: [] }
    } else if (current) {
      current.bodyLines.push(line)
    }
  }
  if (current) sections.push(current)
  return sections.map((s) => ({
    heading: s.heading,
    body: s.bodyLines.join('\n').trim(),
  }))
}

/** Canonical Nemotron anchor: @2188ms-2649ms (after normalize) */
const CANON_RANGE_MS = /@(\d{2,7})ms-(\d{2,7})ms/gi

/** Legacy prose ranges: 2188-2649 ms (still parsed for older coaching files) */
const LEGACY_RANGE_MS = /(\d{2,7})\s*-\s*(\d{2,7})\s*ms/gi

/**
 * All distinct [startMs, endMs] intervals in a section body.
 * Prefers @startms-endms tokens; then scans remainder for legacy `a - b ms`.
 */
function extractRangesFromBody(body) {
  const norm = normalizeCoachingText(body)
  const seen = new Set()
  const ranges = []
  const add = (a, b) => {
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    const key = `${lo}-${hi}`
    if (seen.has(key)) return
    seen.add(key)
    ranges.push({ startMs: lo, endMs: hi })
  }

  let m
  const canon = new RegExp(CANON_RANGE_MS.source, CANON_RANGE_MS.flags)
  while ((m = canon.exec(norm)) !== null) {
    add(parseInt(m[1], 10), parseInt(m[2], 10))
  }

  const stripped = norm.replace(new RegExp(CANON_RANGE_MS.source, 'gi'), ' ')
  const legacy = new RegExp(LEGACY_RANGE_MS.source, LEGACY_RANGE_MS.flags)
  while ((m = legacy.exec(stripped)) !== null) {
    add(parseInt(m[1], 10), parseInt(m[2], 10))
  }

  return ranges
}

/** Plain text for Magpie TTS (Nemotron Voice Agent stack). */
function buildCoachingSpeechText(issue) {
  if (!issue) return ''
  const t0 = (issue.startMs / 1000).toFixed(1)
  const t1 = (issue.endMs / 1000).toFixed(1)
  return `${issue.category}. Roughly ${t0} to ${t1} seconds in this clip. ${issue.rationale}`.replace(/\s+/g, ' ').trim()
}

function bestRationaleForRange(body, startMs, endMs) {
  const sentences = body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const sStr = String(startMs)
  const eStr = String(endMs)
  for (const s of sentences) {
    if (s.includes(sStr) && s.includes(eStr)) return s
  }
  for (const s of sentences) {
    if (s.includes(sStr)) return s
  }
  return body.trim() || ''
}

/**
 * Parsed Nemotron coaching issues: one entry per explicit ms range in the text.
 * Times are ms from the start of this clip (same frame as the replay video).
 */
function parseCoachingIssues(raw) {
  if (!raw || !String(raw).trim()) return []
  const sections = splitCoachingSections(raw)
  const issues = []
  let n = 0
  for (const sec of sections) {
    if (sec.heading.toLowerCase().includes('summary')) continue
    const body = sec.body
    for (const { startMs, endMs } of extractRangesFromBody(body)) {
      n += 1
      issues.push({
        id: `coach-${n}`,
        category: sec.heading,
        startMs,
        endMs,
        rationale: bestRationaleForRange(body, startMs, endMs) || `${sec.heading} (@${startMs}ms-${endMs}ms).`,
      })
    }
  }
  return issues
}

/** Live punch type + metrics below the video (same layout whether idle or active — avoids layout shift). */
function ActivePunchReadout({ punch }) {
  const color = punch ? PUNCH_COLORS[punch.type] || '#6b7280' : '#6b7280'

  return (
    <div className="mt-3 rounded-xl border border-gray-700 bg-gray-900/80 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Active punch</p>
      <div className="flex flex-wrap items-end gap-6 gap-y-3">
        <div className="min-w-[7rem]">
          <span className="text-gray-500 text-xs block mb-0.5">Type</span>
          <span
            className="text-2xl font-black uppercase tracking-wide block leading-none min-h-[2rem] flex items-center"
            style={{ color: punch ? color : undefined }}
          >
            {punch ? (
              punch.type
            ) : (
              <span className="text-gray-600 font-normal text-lg normal-case tracking-normal">—</span>
            )}
          </span>
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="min-w-[4.5rem]">
            <span className="text-gray-500 text-xs block">Velocity</span>
            <span className="text-white text-xl font-bold tabular-nums block min-h-[1.75rem] leading-none flex items-end">
              {punch ? `${punch.velocity_mps} m/s` : '—'}
            </span>
          </div>
          <div className="min-w-[3.5rem]">
            <span className="text-gray-500 text-xs block">Power</span>
            <span className="text-white text-xl font-bold tabular-nums block min-h-[1.75rem] leading-none flex items-end">
              {punch ? punch.power_score : '—'}
            </span>
          </div>
          <div className="min-w-[4rem]">
            <span className="text-gray-500 text-xs block">Confidence</span>
            <span className="text-white text-xl font-bold tabular-nums block min-h-[1.75rem] leading-none flex items-end">
              {punch ? `${(punch.yolo_confidence * 100).toFixed(0)}%` : '—'}
            </span>
          </div>
        </div>
      </div>
      <p
        className={`text-xs mt-2 min-h-[1.25rem] text-gray-600 ${punch ? 'invisible select-none' : ''}`}
        aria-hidden={!!punch}
      >
        Scrub or play to align the playhead with a punch timestamp.
      </p>
    </div>
  )
}

function PunchTimeline({ punches, currentTimeMs, clipStartMs, duration, issues, currentIssue }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mt-4">
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gray-700 -translate-y-1/2" />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 z-10 transition-all duration-100"
          style={{ left: `${(currentTimeMs / duration) * 100}%` }}
        />
        {issues.map((iss) => {
          const isCurrent = currentIssue && iss.id === currentIssue.id
          return (
            <div
              key={`band-${iss.id}`}
              className={`absolute top-0 bottom-0 z-[1] rounded-sm ${isCurrent ? 'opacity-90 ring-1 ring-amber-400 ring-inset' : 'opacity-45'}`}
              style={{
                left: `${(iss.startMs / duration) * 100}%`,
                width: `${((iss.endMs - iss.startMs) / duration) * 100}%`,
                background: 'rgba(251, 191, 36, 0.28)',
              }}
            />
          )
        })}
        {punches.map((p, i) => {
          const relTime = p.timestamp_ms - clipStartMs
          const left = (relTime / duration) * 100
          const color = PUNCH_COLORS[p.type] || '#6b7280'
          const isActive = Math.abs(currentTimeMs - relTime) < 400
          return (
            <div
              key={i}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all z-[2]"
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
      {issues.length > 0 && (
        <p className="text-[10px] text-amber-200/70 mt-1.5">Amber bands = Nemotron-flagged time ranges (same scale as playhead).</p>
      )}
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

function CoachingIssuesPanel({
  sortedIssues,
  issueIndex,
  onPrev,
  onNext,
  currentIssue,
  loopIssue,
  onSelectLoop,
  onClearLoop,
  clipDurationMs,
  ttsReady,
  ttsStatusReason,
  ttsLoading,
  coachingSpeaking,
  onReadAloud,
  onStopSpeech,
  speakOnIssueNav,
  onSpeakOnIssueNavChange,
  ttsError,
}) {
  if (!sortedIssues.length) {
    return (
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 mt-4">
        <h3 className="text-white font-semibold text-sm mb-1">Coach feedback</h3>
        <p className="text-gray-500 text-sm">No Nemotron coaching file for this clip, or no time ranges were parsed.</p>
      </div>
    )
  }

  const total = sortedIssues.length
  const atStart = issueIndex <= 0
  const atEnd = issueIndex >= total - 1
  const iss = currentIssue
  const span = iss ? iss.endMs - iss.startMs : 0
  const pct = clipDurationMs > 0 && iss ? ((span / clipDurationMs) * 100).toFixed(0) : 0
  const looping = iss && loopIssue?.id === iss.id

  return (
    <div className="bg-gray-900/40 border border-amber-900/30 rounded-xl p-4 mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-white font-semibold text-sm">Coach feedback</h3>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <span className="text-gray-500 text-xs font-mono tabular-nums">
            {issueIndex + 1} / {total}
          </span>
          {ttsReady && (
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-gray-600 bg-gray-900 text-amber-500 focus:ring-amber-500/40"
                checked={speakOnIssueNav}
                onChange={(e) => onSpeakOnIssueNavChange(e.target.checked)}
              />
              Speak on prev/next
            </label>
          )}
          {loopIssue && (
            <button
              type="button"
              onClick={onClearLoop}
              className="text-xs px-2 py-1 rounded-md bg-gray-800 text-amber-200 border border-amber-800/50 hover:bg-gray-700"
            >
              Stop loop
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={onPrev}
          disabled={atStart}
          className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={atEnd}
          className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
        >
          Next
        </button>
        <span className="text-[11px] text-gray-500 ml-auto hidden sm:inline">Chronological order</span>
      </div>

      {iss && (
        <div
          className={`rounded-lg border p-4 transition-colors ${
            looping ? 'border-amber-400 bg-amber-950/40' : 'border-gray-700 bg-gray-800/40'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-amber-200/90 font-medium text-sm">{iss.category}</span>
            <span className="text-gray-500 text-xs font-mono">
              {(iss.startMs / 1000).toFixed(2)}s – {(iss.endMs / 1000).toFixed(2)}s
            </span>
            <span className="text-gray-600 text-xs">({pct}% of clip)</span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">{iss.rationale}</p>
          <div className="flex flex-wrap gap-2">
            {ttsReady && (
              <>
                <button
                  type="button"
                  onClick={onReadAloud}
                  disabled={ttsLoading}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-sky-700/60 bg-sky-950/50 text-sky-100 hover:bg-sky-900/50 transition-colors disabled:opacity-50"
                >
                  {ttsLoading ? 'Synthesizing…' : 'Read aloud'}
                </button>
                <button
                  type="button"
                  onClick={onStopSpeech}
                  disabled={!coachingSpeaking && !ttsLoading}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-600 bg-gray-900 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Stop speech
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onSelectLoop(iss)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                looping
                  ? 'bg-amber-500 text-black border-amber-400'
                  : 'bg-gray-900 text-amber-100 border-amber-800/60 hover:bg-gray-800'
              }`}
            >
              {looping ? 'Looping this segment' : 'Loop this segment'}
            </button>
          </div>
          {!ttsReady && (
            <p className="text-[11px] text-gray-600 mt-2">
              Voice (Magpie TTS — same as{' '}
              <a
                href="https://build.nvidia.com/nvidia/nemotron-voice-agent"
                className="text-sky-500/90 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Nemotron Voice Agent
              </a>
              ) is unavailable: {ttsStatusReason || 'check backend logs'}.
              Ensure <span className="font-mono">NVIDIA_API_KEY</span> is set and{' '}
              <span className="font-mono">pip install nvidia-riva-client</span> on the server.
            </p>
          )}
          {ttsError && <p className="text-[11px] text-red-400/90 mt-2">{ttsError}</p>}
        </div>
      )}
    </div>
  )
}

function ClipPlayer({ clip, index, coachingText }) {
  const videoRef = useRef(null)
  const ttsRef = useRef({ objectUrl: null, audio: null })
  const skipSeekForCoachStep = useRef(true)
  const [videoUrl, setVideoUrl] = useState(null)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [activePunch, setActivePunch] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeedState] = useState(1)
  const [loopIssue, setLoopIssue] = useState(null)
  const [issueIndex, setIssueIndex] = useState(0)
  const [ttsStatus, setTtsStatus] = useState({ loaded: false, ok: false, reason: '' })
  const [speakOnIssueNav, setSpeakOnIssueNav] = useState(true)
  const [coachingSpeaking, setCoachingSpeaking] = useState(false)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [ttsError, setTtsError] = useState(null)

  const issues = useMemo(() => parseCoachingIssues(coachingText || ''), [coachingText])

  const sortedIssues = useMemo(() => {
    return [...issues].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs || String(a.id).localeCompare(String(b.id)))
  }, [issues])

  const currentCoachIssue = sortedIssues[issueIndex] ?? null

  const clipDuration = clip.clip_end_ms - clip.clip_start_ms

  const ttsUnavailableHint = useMemo(() => {
    const r = ttsStatus.reason
    if (r === 'no_api_key') return 'NVIDIA_API_KEY is not set on the Flask server.'
    if (r === 'riva_client_missing') return 'Install nvidia-riva-client in the backend virtualenv.'
    if (r === 'magpie_tts_import_failed' || r === 'import_failed') return 'Backend could not import nemotron.magpie_tts.'
    if (r === 'status_fetch_failed') return 'Could not reach /api/replay/tts/status.'
    return r || 'unknown'
  }, [ttsStatus.reason])

  const stopCoachingAudio = useCallback(() => {
    const { objectUrl, audio } = ttsRef.current
    if (audio) {
      try {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      } catch {
        /* ignore */
      }
    }
    if (objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl)
      } catch {
        /* ignore */
      }
    }
    ttsRef.current = { objectUrl: null, audio: null }
    setCoachingSpeaking(false)
    setTtsLoading(false)
  }, [])

  const playCoachingTts = useCallback(
    async (text) => {
      const trimmed = (text || '').trim()
      if (!trimmed) return
      stopCoachingAudio()
      setTtsError(null)
      setTtsLoading(true)
      try {
        const res = await fetch('/api/replay/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          setTtsError(err.error || `TTS request failed (${res.status})`)
          return
        }
        const blob = await res.blob()
        const objectUrl = URL.createObjectURL(blob)
        const audio = new Audio(objectUrl)
        const onDone = () => stopCoachingAudio()
        audio.addEventListener('ended', onDone)
        audio.addEventListener('error', onDone)
        ttsRef.current = { objectUrl, audio }
        await audio.play()
        setCoachingSpeaking(true)
      } catch (e) {
        stopCoachingAudio()
        setTtsError(e?.message || 'Audio playback failed')
      } finally {
        setTtsLoading(false)
      }
    },
    [stopCoachingAudio]
  )

  useEffect(() => {
    fetch('/api/replay/tts/status')
      .then((r) => r.json())
      .then((d) => setTtsStatus({ loaded: true, ok: !!d.ok, reason: d.reason || '' }))
      .catch(() => setTtsStatus({ loaded: true, ok: false, reason: 'status_fetch_failed' }))
  }, [index])

  useEffect(() => {
    stopCoachingAudio()
    setTtsError(null)
  }, [index, coachingText, stopCoachingAudio])

  useEffect(() => () => stopCoachingAudio(), [stopCoachingAudio])

  useEffect(() => {
    setIssueIndex(0)
    skipSeekForCoachStep.current = true
  }, [coachingText])

  useEffect(() => {
    if (!sortedIssues.length) return
    setIssueIndex((i) => Math.min(i, Math.max(0, sortedIssues.length - 1)))
  }, [sortedIssues.length])

  useEffect(() => {
    const iss = sortedIssues[issueIndex]
    if (!iss || !videoRef.current) return
    if (skipSeekForCoachStep.current) {
      skipSeekForCoachStep.current = false
      return
    }
    videoRef.current.currentTime = iss.startMs / 1000
  }, [issueIndex, sortedIssues])

  useEffect(() => {
    if (!loopIssue || !sortedIssues.length) return
    const cur = sortedIssues[issueIndex]
    if (cur && loopIssue.id !== cur.id) {
      setLoopIssue(cur)
    }
  }, [issueIndex, sortedIssues, loopIssue])

  useEffect(() => {
    let url
    fetch(`/api/replay/video/${index}`)
      .then((r) => r.blob())
      .then((blob) => {
        url = URL.createObjectURL(blob)
        setVideoUrl(url)
      })
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [index])

  const onTimeUpdate = useCallback(() => {
    if (!videoRef.current) return
    const ms = videoRef.current.currentTime * 1000
    setCurrentTimeMs(ms)

    if (loopIssue) {
      if (ms >= loopIssue.endMs) {
        videoRef.current.currentTime = loopIssue.startMs / 1000
      }
    }

    const hit = clip.punches.find((p) => {
      const relTime = p.timestamp_ms - clip.clip_start_ms
      return Math.abs(ms - relTime) < 300
    })
    setActivePunch(hit || null)
  }, [clip, loopIssue])

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

  const onSelectLoop = useCallback(
    (iss) => {
      setLoopIssue(iss)
      if (videoRef.current) {
        videoRef.current.currentTime = iss.startMs / 1000
        videoRef.current.play().catch(() => {})
        setPlaying(true)
      }
    },
    []
  )

  const onClearLoop = useCallback(() => {
    setLoopIssue(null)
  }, [])

  const handleReadCoachingAloud = useCallback(() => {
    const issue = sortedIssues[issueIndex]
    if (!issue) return
    playCoachingTts(buildCoachingSpeechText(issue))
  }, [sortedIssues, issueIndex, playCoachingTts])

  const goPrevIssue = useCallback(() => {
    skipSeekForCoachStep.current = false
    setIssueIndex((i) => {
      if (sortedIssues.length === 0) return 0
      const next = Math.max(0, i - 1)
      if (next !== i && speakOnIssueNav && ttsStatus.ok) {
        const issue = sortedIssues[next]
        const text = buildCoachingSpeechText(issue)
        queueMicrotask(() => {
          playCoachingTts(text)
        })
      }
      return next
    })
  }, [sortedIssues, speakOnIssueNav, ttsStatus.ok, playCoachingTts])

  const goNextIssue = useCallback(() => {
    skipSeekForCoachStep.current = false
    setIssueIndex((i) => {
      if (sortedIssues.length === 0) return 0
      const next = Math.min(sortedIssues.length - 1, i + 1)
      if (next !== i && speakOnIssueNav && ttsStatus.ok) {
        const issue = sortedIssues[next]
        const text = buildCoachingSpeechText(issue)
        queueMicrotask(() => {
          playCoachingTts(text)
        })
      }
      return next
    })
  }, [sortedIssues, speakOnIssueNav, ttsStatus.ok, playCoachingTts])

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
        {loopIssue && (
          <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
            <div className="bg-black/75 border border-amber-500/50 rounded-lg px-3 py-2 text-amber-100 text-xs font-medium backdrop-blur-sm">
              Looping: {loopIssue.category} · {(loopIssue.startMs / 1000).toFixed(2)}s–{(loopIssue.endMs / 1000).toFixed(2)}s
            </div>
          </div>
        )}
      </div>

      <ActivePunchReadout punch={activePunch} />

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
        {[0.25, 0.5, 1].map((rate) => (
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

      <div className="mt-3 h-3 bg-gray-800 rounded-full cursor-pointer relative overflow-hidden" onClick={onScrub}>
        {sortedIssues.map((iss) => {
          const isCurrent = currentCoachIssue && iss.id === currentCoachIssue.id
          return (
            <div
              key={`scrub-${iss.id}`}
              className={`absolute top-0 bottom-0 pointer-events-none z-[1] ${isCurrent ? 'bg-amber-500/40 ring-1 ring-amber-400/50' : 'bg-amber-500/25 border-x border-amber-500/30'}`}
              style={{
                left: `${(iss.startMs / clipDuration) * 100}%`,
                width: `${((iss.endMs - iss.startMs) / clipDuration) * 100}%`,
              }}
            />
          )
        })}
        <div
          className="relative z-[2] h-full bg-emerald-500/30 rounded-full pointer-events-none"
          style={{ width: `${(currentTimeMs / clipDuration) * 100}%` }}
        />
        <div
          className="absolute top-1/2 z-[3] -translate-y-1/2 w-3 h-3 bg-emerald-400 rounded-full pointer-events-none"
          style={{ left: `${(currentTimeMs / clipDuration) * 100}%` }}
        />
      </div>

      <PunchTimeline
        punches={clip.punches}
        currentTimeMs={currentTimeMs}
        clipStartMs={clip.clip_start_ms}
        duration={clipDuration}
        issues={sortedIssues}
        currentIssue={currentCoachIssue}
      />

      <CoachingIssuesPanel
        sortedIssues={sortedIssues}
        issueIndex={issueIndex}
        onPrev={goPrevIssue}
        onNext={goNextIssue}
        currentIssue={currentCoachIssue}
        loopIssue={loopIssue}
        onSelectLoop={onSelectLoop}
        onClearLoop={onClearLoop}
        clipDurationMs={clipDuration}
        ttsReady={ttsStatus.loaded && ttsStatus.ok}
        ttsStatusReason={ttsUnavailableHint}
        ttsLoading={ttsLoading}
        coachingSpeaking={coachingSpeaking}
        onReadAloud={handleReadCoachingAloud}
        onStopSpeech={stopCoachingAudio}
        speakOnIssueNav={speakOnIssueNav}
        onSpeakOnIssueNavChange={setSpeakOnIssueNav}
        ttsError={ttsError}
      />

      <PunchLog punches={clip.punches} currentTimeMs={currentTimeMs} clipStartMs={clip.clip_start_ms} />
    </div>
  )
}

export default function Replay({ embedded = false }) {
  const [clips, setClips] = useState([])
  const [coachingByIndex, setCoachingByIndex] = useState({})
  const [clipIndex, setClipIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/replay/clips')
      .then((r) => r.json())
      .then(setClips)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!clips.length) return
    let cancelled = false
    ;(async () => {
      const entries = await Promise.all(
        clips.map((_, i) =>
          fetch(`/api/replay/coaching/${i}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      )
      if (cancelled) return
      const map = {}
      entries.forEach((row, i) => {
        if (row?.text != null) map[i] = row.text
      })
      setCoachingByIndex(map)
    })()
    return () => {
      cancelled = true
    }
  }, [clips])

  useEffect(() => {
    setClipIndex((i) => Math.min(i, Math.max(0, clips.length - 1)))
  }, [clips.length])

  if (loading) {
    return (
      <div className={embedded ? 'rounded-2xl border border-gray-800 bg-gray-900/50 p-8 text-center' : 'min-h-screen bg-gray-950 flex items-center justify-center'}>
        <div className="text-gray-400 text-lg animate-pulse">Loading clips...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={embedded ? 'rounded-2xl border border-red-900/60 bg-red-950/20 p-8 text-center' : 'min-h-screen bg-gray-950 flex items-center justify-center'}>
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    )
  }

  if (!clips.length) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <h1 className="text-3xl font-bold">Punch Replay</h1>
          <p className="text-gray-500 mt-2">No replay clips found. Add mock_inputs clip JSON and MP4 files on the server.</p>
        </div>
      </div>
    )
  }

  const totalClips = clips.length
  const activeClip = clips[clipIndex]
  const atFirstClip = clipIndex <= 0
  const atLastClip = totalClips > 0 && clipIndex >= totalClips - 1

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Punch Replay</h1>
          <p className="text-gray-500 text-sm mt-1">
            One clip at a time &middot; Nemotron-flagged ranges on the timeline (amber) &middot; use Previous / Next clip to move between segments
          </p>
        </div>

        {totalClips > 1 && (
          <div className="flex flex-wrap items-center gap-3 mb-6 rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3">
            <button
              type="button"
              onClick={() => setClipIndex((i) => Math.max(0, i - 1))}
              disabled={atFirstClip}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
            >
              Previous clip
            </button>
            <button
              type="button"
              onClick={() => setClipIndex((i) => Math.min(totalClips - 1, i + 1))}
              disabled={atLastClip}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
            >
              Next clip
            </button>
            <span className="text-gray-400 text-sm font-mono tabular-nums ml-auto">
              Clip {clipIndex + 1} / {totalClips}
            </span>
          </div>
        )}

        {activeClip && (
          <ClipPlayer
            key={clipIndex}
            clip={activeClip}
            index={clipIndex}
            coachingText={coachingByIndex[clipIndex]}
          />
        )}
      </div>
    </section>
  )
}
