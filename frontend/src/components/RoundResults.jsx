import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const SPEED_OPTIONS = [0.1, 0.25, 0.5, 1]
const LOOP_PAD_S = 0.5

const PUNCH_ICONS = {
  jab: 'arrow_forward',
  cross: 'swipe_right',
  hook: 'turn_right',
  uppercut: 'arrow_upward',
  unknown: 'help_outline',
}

const LEVEL_THRESHOLDS = [
  { min: 0, label: 'Beginner', icon: 'hiking', color: 'text-on-surface-variant' },
  { min: 20, label: 'Novice', icon: 'directions_walk', color: 'text-blue-400' },
  { min: 40, label: 'Intermediate', icon: 'directions_run', color: 'text-green-400' },
  { min: 60, label: 'Advanced', icon: 'sprint', color: 'text-yellow-400' },
  { min: 75, label: 'Professional', icon: 'military_tech', color: 'text-orange-400' },
  { min: 90, label: 'World Class', icon: 'emoji_events', color: 'text-red-400' },
]

function getLevelForScore(score) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (score >= LEVEL_THRESHOLDS[i].min) return LEVEL_THRESHOLDS[i]
  }
  return LEVEL_THRESHOLDS[0]
}

function aggregateStats(clips) {
  let total = 0
  const byType = {}

  for (const clip of clips) {
    if (clip.error) continue
    const punches = clip.classified_labels?.punches ?? []
    total += punches.length
    for (const p of punches) {
      const t = p.type || 'unknown'
      byType[t] = (byType[t] || 0) + 1
    }
  }

  return { total, byType }
}

function flattenPunches(clips) {
  const punches = []
  for (const clip of clips) {
    if (clip.error) continue
    const clipPunches = clip.classified_labels?.punches ?? []
    const clipStartMs = clip.classified_labels?.clip_start_ms ?? 0
    for (const p of clipPunches) {
      punches.push({ ...p, clip_index: clip.clip_index, absoluteStartMs: clipStartMs + (p.start_ms ?? 0) })
    }
  }
  return punches
}

function flattenSections(clips) {
  const sections = []
  for (const clip of clips) {
    if (clip.error || !clip.coaching_sections) continue
    const clipPunches = clip.classified_labels?.punches ?? []
    for (const section of clip.coaching_sections) {
      let matchedType = null
      if (section.start_s != null && section.end_s != null) {
        const secStartMs = section.start_s * 1000
        const secEndMs = section.end_s * 1000
        for (const p of clipPunches) {
          if (p.type && p.start_ms != null && p.end_ms != null) {
            if (p.start_ms < secEndMs && p.end_ms > secStartMs) {
              matchedType = p.type
              break
            }
          }
        }
      }
      sections.push({ ...section, clip_index: clip.clip_index, matchedPunchType: matchedType })
    }
  }
  return sections
}

function StatCard({ label, value, icon, accent = false }) {
  return (
    <div className={`flex flex-col items-center gap-1 rounded-xl border px-5 py-4 transition-all ${accent ? 'border-primary/30 bg-primary-container/20' : 'border-surface-container-highest bg-surface-container-high/40'}`}>
      {icon && <span className={`material-symbols-outlined text-2xl ${accent ? 'text-primary' : 'text-on-surface-variant'}`}>{icon}</span>}
      <div className={`font-headline-md text-3xl font-black tabular-nums ${accent ? 'text-primary' : 'text-on-surface'}`}>{value}</div>
      <div className="font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">{label}</div>
    </div>
  )
}

function VideoLooper({ sessionId, clipIndex, startS, endS, speed, onLoaded }) {
  const videoRef = useRef(null)
  const rafRef = useRef(null)
  const [loading, setLoading] = useState(true)

  const src = `/api/live/session/${sessionId}/video/${clipIndex}`

  const paddedStart = Math.max(0, startS - LOOP_PAD_S)
  const paddedEnd = endS + LOOP_PAD_S

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setLoading(true)
    video.pause()
    video.src = src
    video.load()
  }, [src])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = speed
  }, [speed])

  const handleLoaded = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setLoading(false)
    onLoaded?.()
    video.currentTime = paddedStart
    video.play().catch(() => {})
  }, [paddedStart, onLoaded])

  useEffect(() => {
    const video = videoRef.current
    if (!video || loading) return

    video.currentTime = paddedStart
    video.play().catch(() => {})

    const clampedEnd = Math.min(paddedEnd, video.duration || paddedEnd)

    function loopCheck() {
      if (video.currentTime >= clampedEnd) {
        video.currentTime = paddedStart
      }
      rafRef.current = requestAnimationFrame(loopCheck)
    }
    rafRef.current = requestAnimationFrame(loopCheck)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [paddedStart, paddedEnd, loading])

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-container-low/80">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">Loading clip...</span>
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        muted
        playsInline
        onLoadedData={handleLoaded}
      />
    </div>
  )
}

function TtsPlayer({ ttsUrl }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlaying(false)

    if (!ttsUrl) return

    const audio = new Audio(ttsUrl)
    audioRef.current = audio

    const onEnded = () => setPlaying(false)
    const onError = () => setPlaying(false)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    audio.play().then(() => setPlaying(true)).catch(() => {})

    return () => {
      audio.pause()
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [ttsUrl])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.currentTime = 0
      audio.play().then(() => setPlaying(true)).catch(() => {})
    }
  }, [playing])

  if (!ttsUrl) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high/60 px-3 py-1.5 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">
        <span className="material-symbols-outlined text-sm">volume_off</span>
        Audio unavailable
      </span>
    )
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-container/30 px-3 py-1.5 font-label-bold text-xs uppercase tracking-widest text-on-primary-container transition-all hover:bg-primary-container/50 active:scale-95"
      onClick={toggle}
    >
      <span className="material-symbols-outlined text-sm">{playing ? 'pause' : 'volume_up'}</span>
      {playing ? 'Pause' : 'Play Audio'}
    </button>
  )
}

function PunchTable({ punches }) {
  if (!punches.length) return null

  return (
    <div className="rounded-2xl border border-surface-container-highest bg-surface-container-low/60 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-container-highest">
        <span className="material-symbols-outlined text-xl text-primary">format_list_numbered</span>
        <span className="font-headline-md text-base font-bold uppercase tracking-wider text-on-surface">
          Punch Breakdown
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-surface-container-highest bg-surface-container-high/30">
              <th className="px-5 py-3 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">#</th>
              <th className="px-5 py-3 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">Type</th>
              <th className="px-5 py-3 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">Side</th>
              <th className="px-5 py-3 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">Time</th>
              <th className="px-5 py-3 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">Confidence</th>
              <th className="px-5 py-3 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">Clip</th>
            </tr>
          </thead>
          <tbody>
            {punches.map((p, i) => {
              const rawType = p.type || 'unknown'
              const type = rawType === 'unknown' ? 'random' : rawType
              const conf = p.yolo_confidence != null ? `${(p.yolo_confidence * 100).toFixed(0)}%` : '—'
              const timeS = p.absoluteStartMs != null ? `${(p.absoluteStartMs / 1000).toFixed(2)}s` : '—'
              return (
                <tr key={i} className="border-b border-surface-container-highest/50 hover:bg-surface-container-high/20 transition-colors">
                  <td className="px-5 py-3 font-label-bold text-sm tabular-nums text-on-surface-variant">{i + 1}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg text-primary">{PUNCH_ICONS[rawType] || 'help_outline'}</span>
                      <span className="font-label-bold text-sm uppercase tracking-wider text-on-surface">{type}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 font-body-md text-sm text-on-surface-variant capitalize">{p.side || '—'}</td>
                  <td className="px-5 py-3 font-mono text-sm tabular-nums text-on-surface-variant">{timeS}</td>
                  <td className="px-5 py-3 font-mono text-sm tabular-nums text-on-surface-variant">{conf}</td>
                  <td className="px-5 py-3 font-label-bold text-sm tabular-nums text-on-surface-variant">{p.clip_index + 1}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ScoreBadge({ score, level, summary }) {
  if (score == null) return null

  const levelInfo = level
    ? LEVEL_THRESHOLDS.find((l) => l.label.toLowerCase().replace(/\s/g, '_') === level) || getLevelForScore(score)
    : getLevelForScore(score)

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-container/30 to-surface-container-low/60 p-6 md:p-8">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
        {/* Score ring */}
        <div className="relative flex items-center justify-center">
          <svg className="h-28 w-28" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-container-highest" />
            <circle
              cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8"
              className="text-primary"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 327} 327`}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-headline-md text-3xl font-black tabular-nums text-primary">{score}</span>
            <span className="font-label-bold text-[10px] uppercase tracking-widest text-on-surface-variant">/100</span>
          </div>
        </div>

        {/* Level + summary */}
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined text-3xl ${levelInfo.color}`}>{levelInfo.icon}</span>
            <span className={`font-headline-md text-2xl font-black uppercase tracking-wider ${levelInfo.color}`}>
              {levelInfo.label}
            </span>
          </div>
          {summary && (
            <p className="font-body-md text-sm leading-relaxed text-on-surface-variant max-w-md text-center sm:text-left">
              {summary}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function RoundResults({ sessionResults, currentUser, onNewRound, onAddUser, onViewLeaderboard }) {
  const { session_id, clips, score: roundScore } = sessionResults
  const [tipIndex, setTipIndex] = useState(0)
  const [speed, setSpeed] = useState(0.1)
  const [fadeKey, setFadeKey] = useState(0)

  const stats = useMemo(() => aggregateStats(clips), [clips])
  const allPunches = useMemo(() => flattenPunches(clips), [clips])
  const sections = useMemo(() => flattenSections(clips), [clips])

  const tip = sections[tipIndex] ?? null
  const hasTimestamp = tip && tip.start_s != null && tip.end_s != null

  const goNext = useCallback(() => {
    if (tipIndex < sections.length - 1) {
      setTipIndex((i) => i + 1)
      setFadeKey((k) => k + 1)
    }
  }, [tipIndex, sections.length])

  const goPrev = useCallback(() => {
    if (tipIndex > 0) {
      setTipIndex((i) => i - 1)
      setFadeKey((k) => k + 1)
    }
  }, [tipIndex])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev])

  const typeEntries = Object.entries(stats.byType).sort((a, b) => b[1] - a[1])

  return (
    <div className="flex flex-col gap-8 p-4 pt-2 md:p-8 md:pt-3 max-w-5xl mx-auto w-full animate-fade-in">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-4">
        <span className="material-symbols-outlined text-5xl text-primary">emoji_events</span>
        <div>
          <h2 className="font-headline-md text-3xl font-black uppercase tracking-wider text-on-surface">
            Round Complete
          </h2>
          <p className="font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">
            15 seconds analyzed · {stats.total} punches detected
          </p>
        </div>
      </div>

      {/* ---- Score badge ---- */}
      <ScoreBadge
        score={roundScore?.score}
        level={roundScore?.level}
        summary={roundScore?.summary}
      />

      {roundScore?.score != null && (
        <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-surface-container-low/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-2xl text-primary">
              {currentUser ? 'check_circle' : 'person_add'}
            </span>
            <div>
              <p className="font-label-bold text-xs uppercase tracking-widest text-primary">
                {currentUser ? 'Leaderboard Updated' : 'Save This Score'}
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                {currentUser
                  ? `${currentUser.name}'s leaderboard score is now ${Math.round(roundScore.score)}. Their next completed round will replace it.`
                  : 'Add a user now to keep this score on the leaderboard.'}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {!currentUser && (
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2.5 font-label-bold text-xs uppercase tracking-widest text-on-primary transition-all hover:opacity-90 active:scale-95"
                onClick={onAddUser}
              >
                Add User
              </button>
            )}
            <button
              type="button"
              className="rounded-lg border border-surface-container-highest bg-surface-container-high/40 px-4 py-2.5 font-label-bold text-xs uppercase tracking-widest text-on-surface transition-all hover:bg-surface-container-highest active:scale-95"
              onClick={onViewLeaderboard}
            >
              Leaderboard
            </button>
          </div>
        </div>
      )}

      {/* ---- Stats row ---- */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-3">
        <StatCard label="Seconds" value="15" icon="timer" />
        <StatCard label="Total Punches" value={stats.total} icon="sports_mma" accent />
        {typeEntries.map(([type, count]) => (
          <StatCard key={type} label={type === 'unknown' ? 'random' : type} value={count} icon={PUNCH_ICONS[type] || 'help_outline'} />
        ))}
      </div>

      {/* ---- Coaching carousel ---- */}
      {sections.length > 0 ? (
        <div className="flex flex-col gap-5 rounded-2xl border border-surface-container-highest bg-surface-container-low/60 p-5 md:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl text-primary">school</span>
              <span className="font-headline-md text-base font-bold uppercase tracking-wider text-on-surface">
                Coaching Tips
              </span>
            </div>
            <span className="font-label-bold text-xs uppercase tracking-widest text-on-surface-variant tabular-nums">
              Tip {tipIndex + 1} of {sections.length}
            </span>
          </div>

          {/* Tip content with fade transition */}
          <div key={fadeKey} className="flex flex-col gap-5 animate-tip-fade">
            {/* Video — full width above text */}
            {hasTimestamp && (
              <div className="flex flex-col gap-3">
                <VideoLooper
                  sessionId={session_id}
                  clipIndex={tip.clip_index}
                  startS={tip.start_s}
                  endS={tip.end_s}
                  speed={speed}
                />
                {/* Speed controls */}
                <div className="flex items-center gap-3">
                  <span className="font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">Speed</span>
                  <div className="flex gap-1">
                    {SPEED_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`rounded-lg px-3 py-1.5 font-label-bold text-xs transition-all ${speed === s ? 'bg-primary text-on-primary' : 'bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-highest'}`}
                        onClick={() => setSpeed(s)}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Text below video */}
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="font-headline-md text-xl font-bold text-on-surface leading-snug">
                  {tip.heading}
                </h3>
                {hasTimestamp && (
                  <span className="mt-1 inline-block font-label-bold text-xs uppercase tracking-widest text-primary/70 tabular-nums">
                    Clip {tip.clip_index + 1} · {tip.start_s.toFixed(1)}s – {tip.end_s.toFixed(1)}s
                  </span>
                )}
              </div>
              <p className="font-body-md text-base leading-relaxed text-on-surface-variant whitespace-pre-line">
                {tip.body}
              </p>
              <div className="pt-2">
                <TtsPlayer ttsUrl={tip.tts_url} />
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-surface-container-highest pt-4">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-surface-container-highest bg-surface-container-high/40 px-4 py-2.5 font-label-bold text-xs uppercase tracking-widest text-on-surface transition-all hover:bg-surface-container-highest active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
              disabled={tipIndex === 0}
              onClick={goPrev}
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Previous
            </button>

            {/* Dot indicator */}
            <div className="hidden sm:flex items-center gap-1">
              {sections.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to tip ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${i === tipIndex ? 'w-6 bg-primary' : 'w-2 bg-surface-container-highest hover:bg-on-surface-variant/40'}`}
                  onClick={() => { setTipIndex(i); setFadeKey((k) => k + 1) }}
                />
              ))}
            </div>

            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-surface-container-highest bg-surface-container-high/40 px-4 py-2.5 font-label-bold text-xs uppercase tracking-widest text-on-surface transition-all hover:bg-surface-container-highest active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
              disabled={tipIndex === sections.length - 1}
              onClick={goNext}
            >
              Next
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-surface-container-highest bg-surface-container-low/60 p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant">info</span>
          <p className="font-body-md text-base text-on-surface-variant">No coaching tips were generated for this round.</p>
        </div>
      )}

      {/* ---- New Round button ---- */}
      <button
        type="button"
        className="w-full rounded-xl bg-primary py-5 font-label-bold text-base uppercase tracking-[0.3em] text-on-primary shadow-lg transition-all hover:opacity-90 active:scale-[0.98]"
        onClick={onNewRound}
      >
        <span className="material-symbols-outlined align-middle mr-2 text-xl">replay</span>
        New Round
      </button>

      {/* ---- Punch table ---- */}
      <PunchTable punches={allPunches} />

    </div>
  )
}
