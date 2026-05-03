import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import '../App.css'

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

/** Canonical Nemotron anchor (seconds): @2.188s-2.649s (after normalize) */
const CANON_RANGE_S = /@(\d+(?:\.\d+)?)s-(\d+(?:\.\d+)?)s/gi

/** Legacy Nemotron anchor (ms): @2188ms-2649ms — still parsed for older coaching files */
const CANON_RANGE_MS = /@(\d{2,7})ms-(\d{2,7})ms/gi

/** Legacy prose ranges: 2188-2649 ms (still parsed for older coaching files) */
const LEGACY_RANGE_MS = /(\d{2,7})\s*-\s*(\d{2,7})\s*ms/gi

/**
 * All distinct [startMs, endMs] intervals in a chunk of coaching text (heading and/or body).
 * Prefers @starts-ends tokens; then @startms-endms; then legacy `a - b ms` prose.
 */
function extractRangesFromText(text) {
  const norm = normalizeCoachingText(text || '')
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
  const canonS = new RegExp(CANON_RANGE_S.source, CANON_RANGE_S.flags)
  while ((m = canonS.exec(norm)) !== null) {
    add(Math.round(parseFloat(m[1]) * 1000), Math.round(parseFloat(m[2]) * 1000))
  }

  const canonMs = new RegExp(CANON_RANGE_MS.source, CANON_RANGE_MS.flags)
  while ((m = canonMs.exec(norm)) !== null) {
    add(parseInt(m[1], 10), parseInt(m[2], 10))
  }

  let stripped = norm.replace(new RegExp(CANON_RANGE_S.source, 'gi'), ' ')
  stripped = stripped.replace(new RegExp(CANON_RANGE_MS.source, 'gi'), ' ')
  const legacy = new RegExp(LEGACY_RANGE_MS.source, LEGACY_RANGE_MS.flags)
  while ((m = legacy.exec(stripped)) !== null) {
    add(parseInt(m[1], 10), parseInt(m[2], 10))
  }

  return ranges
}

/** Remove @…s-…s / @…ms-…ms / legacy ms prose — keep in files & UI headings; omit from TTS. */
function stripCoachingAnchorsForSpeech(text) {
  if (!text) return ''
  let s = normalizeCoachingText(String(text))
  s = s.replace(new RegExp(CANON_RANGE_S.source, 'gi'), '')
  s = s.replace(new RegExp(CANON_RANGE_MS.source, 'gi'), '')
  s = s.replace(new RegExp(LEGACY_RANGE_MS.source, 'gi'), '')
  s = s.replace(/''|""/g, '')
  s = s.replace(/\s+/g, ' ')
  s = s.replace(/\s+([.,!?;:])/g, '$1')
  return s.trim()
}

/** Plain text for Magpie TTS — spoken label + body only (no timestamp tokens). */
function buildCoachingSpeechText(issue) {
  if (!issue) return ''
  const title = stripCoachingAnchorsForSpeech(issue.category)
  const body = stripCoachingAnchorsForSpeech(issue.rationale)
  if (!body) return title ? `${title}.` : ''
  return `${title}. ${body}`.replace(/\s+/g, ' ').trim()
}

function tokenMatchesRangeMs(text, startMs, endMs, tolMs = 100) {
  const reS = /@(\d+(?:\.\d+)?)s-(\d+(?:\.\d+)?)s/gi
  let m
  while ((m = reS.exec(text)) !== null) {
    const a = Math.round(parseFloat(m[1]) * 1000)
    const b = Math.round(parseFloat(m[2]) * 1000)
    if (Math.abs(a - startMs) <= tolMs && Math.abs(b - endMs) <= tolMs) return true
  }
  const reMs = /@(\d+)ms-(\d+)ms/gi
  while ((m = reMs.exec(text)) !== null) {
    const a = parseInt(m[1], 10)
    const b = parseInt(m[2], 10)
    if (Math.abs(a - startMs) <= tolMs && Math.abs(b - endMs) <= tolMs) return true
  }
  return false
}

function bestRationaleForRange(body, startMs, endMs) {
  const sentences = body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  for (const s of sentences) {
    if (tokenMatchesRangeMs(s, startMs, endMs)) return s
  }
  const sStr = String(startMs)
  const eStr = String(endMs)
  for (const s of sentences) {
    if (s.includes(sStr) && s.includes(eStr)) return s
  }
  for (const d of [3, 2, 1]) {
    const a = (startMs / 1000).toFixed(d)
    const b = (endMs / 1000).toFixed(d)
    for (const s of sentences) {
      if (s.includes(a) && s.includes(b)) return s
    }
  }
  for (const s of sentences) {
    if (s.includes(sStr)) return s
  }
  return body.trim() || ''
}

/**
 * Parsed Nemotron coaching issues: anchored ranges from section headings (new format) or body (legacy).
 * Stored as ms from clip start (same frame as the replay video).
 */
function parseCoachingIssues(raw) {
  if (!raw || !String(raw).trim()) return []
  const sections = splitCoachingSections(raw)
  const issues = []
  let n = 0
  for (const sec of sections) {
    if (sec.heading.toLowerCase().includes('summary')) continue
    const body = sec.body
    const fromHeading = extractRangesFromText(sec.heading)
    const fromBody = extractRangesFromText(body)
    const ranges = fromHeading.length > 0 ? fromHeading : fromBody
    const useHeadingAnchors = fromHeading.length > 0

    for (const { startMs, endMs } of ranges) {
      n += 1
      let rationale
      if (useHeadingAnchors && fromHeading.length === 1 && !fromBody.length) {
        rationale =
          body.trim() ||
          `${stripCoachingAnchorsForSpeech(sec.heading)} (@${(startMs / 1000).toFixed(2)}s–${(endMs / 1000).toFixed(2)}s).`
      } else if (useHeadingAnchors) {
        rationale =
          bestRationaleForRange(body, startMs, endMs) ||
          body.trim() ||
          `${stripCoachingAnchorsForSpeech(sec.heading)} (@${(startMs / 1000).toFixed(2)}s–${(endMs / 1000).toFixed(2)}s).`
      } else {
        rationale =
          bestRationaleForRange(body, startMs, endMs) ||
          `${sec.heading} (@${(startMs / 1000).toFixed(2)}s–${(endMs / 1000).toFixed(2)}s).`
      }
      issues.push({
        id: `coach-${n}`,
        category: sec.heading,
        startMs,
        endMs,
        rationale,
      })
    }
  }
  return issues
}

/** Live punch type + metrics below the video (same layout whether idle or active — avoids layout shift). */
function ActivePunchReadout({ punch }) {
  const color = punch ? PUNCH_COLORS[punch.type] || '#6b7280' : '#6b7280'

  return (
    <div className="replay-readout">
      <p className="replay-readout-kicker">Active punch</p>
      <div className="replay-readout-grid">
        <div className="min-w-[7rem]">
          <span className="replay-readout-stat-label">Type</span>
          <span
            className={`replay-readout-type ${!punch ? 'replay-readout-type--idle' : ''}`}
            style={{ color: punch ? color : undefined }}
          >
            {punch ? punch.type : '—'}
          </span>
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="min-w-[4.5rem]">
            <span className="replay-readout-stat-label">Velocity</span>
            <span className="replay-readout-stat-value">{punch ? `${punch.velocity_mps} m/s` : '—'}</span>
          </div>
          <div className="min-w-[3.5rem]">
            <span className="replay-readout-stat-label">Power</span>
            <span className="replay-readout-stat-value">{punch ? punch.power_score : '—'}</span>
          </div>
          <div className="min-w-[4rem]">
            <span className="replay-readout-stat-label">Confidence</span>
            <span className="replay-readout-stat-value">
              {punch ? `${(punch.yolo_confidence * 100).toFixed(0)}%` : '—'}
            </span>
          </div>
        </div>
      </div>
      <p
        className={`replay-readout-hint ${punch ? 'replay-readout-hint--ghost' : ''}`}
        aria-hidden={!!punch}
      >
        Scrub or play to align the playhead with a punch timestamp.
      </p>
    </div>
  )
}

function PunchTimeline({ punches, currentTimeMs, clipStartMs, duration, issues, currentIssue }) {
  return (
    <div className="replay-timeline">
      <div className="replay-timeline-rail">
        <div className="replay-timeline-tick" />
        <div
          className="replay-timeline-playhead"
          style={{ left: `${(currentTimeMs / duration) * 100}%` }}
        />
        {issues.map((iss) => {
          const isCurrent = currentIssue && iss.id === currentIssue.id
          return (
            <div
              key={`band-${iss.id}`}
              className={`replay-timeline-band ${isCurrent ? 'replay-timeline-band--current' : ''}`}
              style={{
                left: `${(iss.startMs / duration) * 100}%`,
                width: `${((iss.endMs - iss.startMs) / duration) * 100}%`,
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
              className="absolute top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all"
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
        <p className="replay-timeline-hint">Primary bands = Nemotron-flagged time ranges (same scale as playhead).</p>
      )}
    </div>
  )
}

function PunchLog({ punches, currentTimeMs, clipStartMs }) {
  return (
    <div className="replay-punch-log">
      <h3>Punch log</h3>
      <div className="space-y-1">
        {punches.map((p, i) => {
          const relTime = p.timestamp_ms - clipStartMs
          const isActive = Math.abs(currentTimeMs - relTime) < 400
          const color = PUNCH_COLORS[p.type] || '#6b7280'
          return (
            <div key={i} className={`replay-punch-row ${isActive ? 'is-active' : ''}`}>
              <span className="replay-punch-time">{(relTime / 1000).toFixed(1)}s</span>
              <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className="replay-punch-name">{p.type}</span>
              <span className="replay-punch-meta">{p.velocity_mps} m/s</span>
              <span className="replay-punch-meta">pwr {p.power_score}</span>
              <span className="replay-punch-meta">{(p.yolo_confidence * 100).toFixed(0)}%</span>
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
      <div className="replay-coach-panel replay-coach-panel--empty">
        <h3 className="replay-coach-title mb-1">Coach feedback</h3>
        <p className="replay-muted text-sm">No Nemotron coaching file for this clip, or no time ranges were parsed.</p>
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
    <div className="replay-coach-panel">
      <div className="replay-coach-header">
        <h3 className="replay-coach-title">Coach feedback</h3>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="replay-muted font-mono text-xs tabular-nums">
            {issueIndex + 1} / {total}
          </span>
          {ttsReady && (
            <label className="replay-checkbox-label">
              <input
                type="checkbox"
                checked={speakOnIssueNav}
                onChange={(e) => onSpeakOnIssueNavChange(e.target.checked)}
              />
              Speak on prev/next
            </label>
          )}
          {loopIssue && (
            <button type="button" onClick={onClearLoop} className="replay-btn replay-btn--compact replay-btn--stop-loop">
              Stop loop
            </button>
          )}
        </div>
      </div>

      <div className="replay-coach-nav-row">
        <button type="button" onClick={onPrev} disabled={atStart} className="replay-btn flex-1 min-[640px]:flex-none px-4 py-2">
          Previous
        </button>
        <button type="button" onClick={onNext} disabled={atEnd} className="replay-btn flex-1 min-[640px]:flex-none px-4 py-2">
          Next
        </button>
        <span className="replay-muted replay-coach-chrono text-[11px]">Chronological order</span>
      </div>

      {iss && (
        <div className={`replay-coach-card ${looping ? 'is-looping' : ''}`}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="replay-coach-category">{iss.category}</span>
            <span className="replay-coach-range">
              {(iss.startMs / 1000).toFixed(2)}s – {(iss.endMs / 1000).toFixed(2)}s
            </span>
            <span className="replay-coach-pct">({pct}% of clip)</span>
          </div>
          <p className="replay-coach-body">{iss.rationale}</p>
          <div className="replay-coach-actions">
            {ttsReady && (
              <>
                <button
                  type="button"
                  onClick={onReadAloud}
                  disabled={ttsLoading}
                  className="replay-btn replay-btn--compact replay-btn--tts"
                >
                  {ttsLoading ? 'Synthesizing…' : 'Read aloud'}
                </button>
                <button
                  type="button"
                  onClick={onStopSpeech}
                  disabled={!coachingSpeaking && !ttsLoading}
                  className="replay-btn replay-btn--compact replay-btn--mute"
                >
                  Stop speech
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onSelectLoop(iss)}
              className={`replay-btn replay-btn--compact ${looping ? 'replay-btn--loop-on' : 'replay-btn--loop-off'}`}
            >
              {looping ? 'Looping this segment' : 'Loop this segment'}
            </button>
          </div>
          {!ttsReady && (
            <p className="replay-muted mt-2 text-[11px]">
              Voice (Magpie TTS — same as{' '}
              <a
                href="https://build.nvidia.com/nvidia/nemotron-voice-agent"
                className="replay-link"
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
          {ttsError && <p className="replay-error-text">{ttsError}</p>}
        </div>
      )}
    </div>
  )
}

function ClipPlayer({ clip, index, coachingText }) {
  const videoRef = useRef(null)
  const ttsRef = useRef({ objectUrl: null, audio: null })
  /** Cancels in-flight /api/replay/tts fetch when starting a new utterance or stopping. */
  const ttsFetchAbortRef = useRef(null)
  /** Incremented on every stop or new speak — stale async work must not start another Audio. */
  const ttsSessionRef = useRef(0)
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
    try {
      ttsFetchAbortRef.current?.abort()
    } catch {
      /* ignore */
    }
    ttsFetchAbortRef.current = null
    ttsSessionRef.current += 1

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
      const mySession = ttsSessionRef.current
      setTtsError(null)
      setTtsLoading(true)

      const ac = new AbortController()
      ttsFetchAbortRef.current = ac

      try {
        const res = await fetch('/api/replay/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed }),
          signal: ac.signal,
        })
        if (ttsSessionRef.current !== mySession) return

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          if (ttsSessionRef.current !== mySession) return
          setTtsError(err.error || `TTS request failed (${res.status})`)
          return
        }
        const blob = await res.blob()
        if (ttsSessionRef.current !== mySession) return

        const objectUrl = URL.createObjectURL(blob)
        const audio = new Audio(objectUrl)
        const onDone = () => {
          audio.removeEventListener('ended', onDone)
          audio.removeEventListener('error', onDone)
          stopCoachingAudio()
        }
        audio.addEventListener('ended', onDone)
        audio.addEventListener('error', onDone)
        ttsRef.current = { objectUrl, audio }

        if (ttsSessionRef.current !== mySession) {
          try {
            URL.revokeObjectURL(objectUrl)
          } catch {
            /* ignore */
          }
          ttsRef.current = { objectUrl: null, audio: null }
          return
        }

        await audio.play()
        if (ttsSessionRef.current !== mySession) {
          try {
            audio.pause()
            audio.removeAttribute('src')
            audio.load()
            URL.revokeObjectURL(objectUrl)
          } catch {
            /* ignore */
          }
          ttsRef.current = { objectUrl: null, audio: null }
          return
        }
        setCoachingSpeaking(true)
      } catch (e) {
        if (e?.name === 'AbortError' || ac.signal.aborted) return
        if (ttsSessionRef.current !== mySession) return
        stopCoachingAudio()
        setTtsError(e?.message || 'Audio playback failed')
      } finally {
        if (ttsFetchAbortRef.current === ac) {
          ttsFetchAbortRef.current = null
        }
        if (ttsSessionRef.current === mySession) {
          setTtsLoading(false)
        }
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
      <div className="replay-panel">
        <div className="replay-muted animate-pulse">Loading clip {index}...</div>
      </div>
    )
  }

  return (
    <div className="replay-panel">
      <div className="replay-clip-header">
        <h2 className="replay-clip-title">
          Clip {index}{' '}
          <span>
            ({clip.clip_start_ms / 1000}s – {clip.clip_end_ms / 1000}s)
          </span>
        </h2>
        <span className="replay-punch-count">{clip.punches.length} punches</span>
      </div>

      <div className="replay-video-frame">
        <video
          ref={videoRef}
          src={videoUrl}
          onTimeUpdate={onTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          preload="auto"
          playsInline
        />
        {loopIssue && (
          <div className="replay-loop-banner">
            <div className="replay-loop-banner-inner">
              Looping: {loopIssue.category} · {(loopIssue.startMs / 1000).toFixed(2)}s–
              {(loopIssue.endMs / 1000).toFixed(2)}s
            </div>
          </div>
        )}
      </div>

      <ActivePunchReadout punch={activePunch} />

      <div className="replay-controls">
        <button type="button" onClick={() => seek(-2)} className="replay-btn">
          −2s
        </button>
        <button type="button" onClick={togglePlay} className="replay-btn replay-btn--primary">
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={() => seek(2)} className="replay-btn">
          +2s
        </button>
        <div className="replay-controls-divider" />
        {[0.25, 0.5, 1].map((rate) => (
          <button
            key={rate}
            type="button"
            onClick={() => setSpeed(rate)}
            className={`replay-btn replay-btn--speed ${speed === rate ? 'replay-btn--speed-active' : ''}`}
          >
            {rate}x
          </button>
        ))}
        <span className="replay-timecode">
          {(currentTimeMs / 1000).toFixed(1)}s / {(clipDuration / 1000).toFixed(0)}s
        </span>
      </div>

      <div className="replay-scrub" onClick={onScrub} role="presentation">
        {sortedIssues.map((iss) => {
          const isCurrent = currentCoachIssue && iss.id === currentCoachIssue.id
          return (
            <div
              key={`scrub-${iss.id}`}
              className={`replay-scrub-issue ${isCurrent ? 'replay-scrub-issue--current' : ''}`}
              style={{
                left: `${(iss.startMs / clipDuration) * 100}%`,
                width: `${((iss.endMs - iss.startMs) / clipDuration) * 100}%`,
              }}
            />
          )
        })}
        <div
          className="replay-scrub-fill"
          style={{ width: `${(currentTimeMs / clipDuration) * 100}%` }}
        />
        <div
          className="replay-scrub-knob"
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
  const rootClass = embedded ? 'replay-root replay-root--embedded' : 'replay-root'
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
      <div className={embedded ? 'replay-panel-loading' : `${rootClass} flex items-center justify-center`}>
        <div className="replay-muted animate-pulse text-lg">Loading clips...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={embedded ? 'replay-panel-error' : `${rootClass} flex items-center justify-center p-8`}>
        <p className="text-lg" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      </div>
    )
  }

  if (!clips.length) {
    return (
      <div className={embedded ? 'replay-root--embedded' : 'replay-empty-page'}>
        <div className={embedded ? '' : 'replay-empty-inner'}>
          <h1 className="replay-hero-title">Punch replay</h1>
          <p className="replay-hero-desc mt-2">
            No replay clips found. Add mock_inputs clip JSON and MP4 files on the server.
          </p>
        </div>
      </div>
    )
  }

  const totalClips = clips.length
  const activeClip = clips[clipIndex]
  const atFirstClip = clipIndex <= 0
  const atLastClip = totalClips > 0 && clipIndex >= totalClips - 1

  return (
    <div className={rootClass}>
      <div className="replay-container">
        <div className="mb-6">
          <h1 className="replay-hero-title">Punch replay</h1>
          <p className="replay-hero-desc">
            One clip at a time · Nemotron-flagged ranges on the timeline · use Previous / Next clip to move between
            segments
          </p>
        </div>

        {totalClips > 1 && (
          <div className="replay-clip-nav">
            <button
              type="button"
              onClick={() => setClipIndex((i) => Math.max(0, i - 1))}
              disabled={atFirstClip}
              className="replay-btn px-4 py-2"
            >
              Previous clip
            </button>
            <button
              type="button"
              onClick={() => setClipIndex((i) => Math.min(totalClips - 1, i + 1))}
              disabled={atLastClip}
              className="replay-btn px-4 py-2"
            >
              Next clip
            </button>
            <span className="replay-clip-nav-count">
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
    </div>
  )
}
