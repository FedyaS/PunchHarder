import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DebugPanel } from '../components/DebugPanel.jsx'
import { LiveCamera } from '../components/LiveCamera.jsx'
import { RoundResults } from '../components/RoundResults.jsx'
import { useLivePunchClassifier } from '../hooks/useLivePunchClassifier.js'
import { useSessionRound } from '../hooks/useSessionRound.js'

export default function LiveAnalysisPage({ embedded = false }) {
  const liveCameraRef = useRef(null)
  const { classifyClip, error: classifierError, status: classifierStatus } = useLivePunchClassifier()
  const [classifiedPunches, setClassifiedPunches] = useState([])
  const [metrics, setMetrics] = useState(null)

  const {
    phase,
    countdown,
    timeLeft,
    clipIndex: sessionClipIndex,
    sessionId,
    results: sessionResults,
    error: sessionError,
    startRound,
    resetSession,
  } = useSessionRound({ liveCameraRef })

  const handleMetrics = useCallback((next) => {
    setMetrics(next)
  }, [])
  const handlePunchClipReady = useCallback(
    async ({ filename, labels, videoBlob }) => {
      const result = await classifyClip({ filename, labels, videoBlob })
      const punches = result.labels?.punches ?? []
      const loggedPunches = punches.map((punch) => ({
        clipIndex: result.clip_index,
        time: new Date().toLocaleTimeString([], { hour12: false }),
        type: punch.type || 'unknown',
        confidence: punch.yolo_confidence,
      }))

      setClassifiedPunches((current) => [...loggedPunches, ...current].slice(0, 8))
      return result
    },
    [classifyClip],
  )

  return (
    <div className={embedded ? 'text-on-background' : 'bg-background text-on-background font-body-md selection:bg-primary-container selection:text-on-primary-container min-h-screen flex flex-col pb-20 md:pb-0'}>
      {!embedded && (
      <header className="bg-surface-container-low/95 backdrop-blur-xl text-primary font-headline-md uppercase tracking-tight top-0 border-b border-surface-container-highest flex justify-between items-center px-6 py-4 w-full sticky z-50">
        <Link to="/" className="text-2xl font-black italic tracking-widest text-primary">
          PUNCHHARDER
        </Link>
        <nav className="hidden md:flex items-center gap-8 font-label-bold text-xs">
          <Link to="/dashboard" className="text-on-surface-variant hover:text-primary transition-colors">
            Training
          </Link>
          <span className="text-primary border-b-2 border-primary pb-1 cursor-default">Analysis</span>
          <Link to="/session" className="text-on-surface-variant hover:text-primary transition-colors">
            History
          </Link>
          <span className="text-on-surface-variant hover:text-primary transition-colors cursor-default">Leaderboard</span>
        </nav>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer">notifications</span>
          <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer">settings</span>
          <button
            type="button"
            className="bg-primary-container text-on-primary-container px-6 py-2 font-bold hover:bg-primary hover:text-on-primary transition-all active:scale-95 text-xs tracking-wider rounded-lg border-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            disabled={metrics?.status === 'loading' || metrics?.isLive}
            onClick={() => liveCameraRef.current?.startCamera()}
          >
            GO LIVE
          </button>
        </div>
      </header>
      )}

      <main className={embedded ? 'grid gap-6' : 'flex-grow flex flex-col lg:flex-row h-[calc(100vh-144px)] lg:h-[calc(100vh-72px)] overflow-hidden'}>
        {!embedded && phase !== 'results' && (
        <aside className="hidden lg:flex flex-col p-4 sticky left-0 bg-surface-container-low w-64 border-r border-surface-container-highest font-headline-md self-start h-full">
          <div className="text-primary font-black text-xl mb-8">SESSION LIVE</div>
          <nav className="flex flex-col gap-2 font-label-bold">
            <Link to="/dashboard" className="text-on-surface-variant hover:bg-surface-container-high transition-all p-3 flex items-center gap-3 rounded-lg">
              <span className="material-symbols-outlined">dashboard</span> Overview
            </Link>
            <div className="bg-primary text-on-primary font-bold p-3 flex items-center gap-3 border-r-4 border-on-primary rounded-lg">
              <span className="material-symbols-outlined">videocam</span> Live Feed
            </div>
            <span className="text-on-surface-variant hover:bg-surface-container-high transition-all p-3 flex items-center gap-3 cursor-pointer rounded-lg">
              <span className="material-symbols-outlined">insert_chart</span> Analytics
            </span>
            <span className="text-on-surface-variant hover:bg-surface-container-high transition-all p-3 flex items-center gap-3 cursor-pointer rounded-lg">
              <span className="material-symbols-outlined">sports_kabaddi</span> Drills
            </span>
            <div className="mt-auto pt-8 border-t border-surface-container-highest">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div>
                  <div className="text-on-surface text-sm font-bold uppercase font-headline-md">PRO ATHLETE</div>
                  <div className="text-on-surface-variant text-[10px]">Rank #124</div>
                </div>
              </div>
              <Link
                to="/session"
                className="w-full bg-error-container text-on-error-container font-bold py-4 active:scale-95 transition-transform uppercase tracking-widest text-[10px] font-label-bold border border-error/20 rounded-lg text-center block"
              >
                STOP SESSION
              </Link>
            </div>
          </nav>
        </aside>
        )}

        {/* ---- Full results screen ---- */}
        {phase === 'results' && sessionResults ? (
          <section className="flex-grow overflow-y-auto bg-background">
            <RoundResults sessionResults={sessionResults} onNewRound={resetSession} />
            {sessionError && (
              <p className="text-error text-xs text-center pb-4">{sessionError}</p>
            )}
          </section>
        ) : (
        <section className={embedded ? 'relative flex aspect-video min-h-[520px] w-full flex-col overflow-hidden rounded-2xl border border-surface-container-highest bg-black' : 'flex-grow relative bg-black flex flex-col min-h-[40vh]'}>
          <div className="flex-grow relative overflow-hidden group min-h-0 flex flex-col">
            <LiveCamera ref={liveCameraRef} embedded onMetrics={handleMetrics} className="min-h-[280px] flex-1" />

            {/* --- Status badges (top-left) --- */}
            <div className="pointer-events-none absolute top-8 left-8 z-30 flex flex-col gap-2">
              <div className="bg-surface-container-low/80 backdrop-blur-md px-4 py-2 border-l-4 border-primary flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${metrics?.isLive ? 'bg-error animate-pulse' : 'bg-on-surface-variant'}`}
                />
                <span className="font-label-bold text-[10px] text-on-surface uppercase tracking-widest">
                  {phase === 'recording'
                    ? `REC · CLIP ${sessionClipIndex + 1}/3`
                    : phase === 'countdown'
                      ? 'GET READY'
                      : phase === 'processing'
                        ? 'ANALYZING'
                        : metrics?.isLive
                          ? 'LIVE ANALYSIS ACTIVE'
                          : 'LIVE ANALYSIS STANDBY'}
                </span>
              </div>
              {metrics?.isLive && phase === 'idle' && (
                <div className="bg-surface-container-low/80 backdrop-blur-md px-4 py-2 border-l-4 border-primary/60 flex items-center gap-2 pointer-events-auto">
                  <span className="font-label-bold text-[10px] text-on-surface-variant uppercase tracking-widest">
                    Poses in frame:{' '}
                    <span className="font-mono text-primary">{metrics.poseCount ?? 0}</span>
                  </span>
                </div>
              )}
              {classifierStatus !== 'idle' && phase === 'idle' && (
                <div className="bg-surface-container-low/80 backdrop-blur-md px-4 py-2 border-l-4 border-secondary/70 flex items-center gap-2 pointer-events-auto">
                  <span className="font-label-bold text-[10px] text-on-surface-variant uppercase tracking-widest">
                    Model: <span className="font-mono text-secondary">{classifierStatus}</span>
                  </span>
                </div>
              )}
            </div>

            {/* --- Countdown overlay --- */}
            {phase === 'countdown' && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-[120px] font-black text-primary leading-none tabular-nums animate-pulse">
                    {countdown}
                  </div>
                  <div className="font-headline-md text-xl uppercase tracking-widest text-on-surface">
                    Get ready to punch!
                  </div>
                </div>
              </div>
            )}

            {/* --- Recording timer bar --- */}
            {phase === 'recording' && (
              <div className="absolute top-8 right-8 z-40 flex flex-col items-end gap-2">
                <div className="bg-error/90 backdrop-blur-md px-5 py-3 rounded-lg flex items-center gap-3 shadow-2xl">
                  <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                  <span className="font-headline-md text-2xl text-white tabular-nums font-black">
                    {(timeLeft / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="bg-surface-container-low/80 backdrop-blur-md px-4 py-2 rounded-lg">
                  <span className="font-label-bold text-xs text-on-surface uppercase tracking-widest">
                    Punches:{' '}
                    <span className="text-primary font-black text-lg">{metrics?.punchCount ?? 0}</span>
                  </span>
                </div>
              </div>
            )}

            {/* --- Processing overlay --- */}
            {phase === 'processing' && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-6">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <div className="font-headline-md text-xl uppercase tracking-widest text-on-surface">
                    Analyzing your round...
                  </div>
                  <div className="font-body-md text-sm text-on-surface-variant">
                    Running YOLO classification + Nemotron coaching
                  </div>
                </div>
              </div>
            )}

            {/* --- Idle: punch count bar + start round button --- */}
            {phase === 'idle' && (
              <div className="absolute bottom-12 left-1/2 z-20 -translate-x-1/2 w-full max-w-xl px-4 pointer-events-none">
                <div className="bg-primary-container text-on-primary-container p-6 flex items-center justify-between shadow-2xl rounded-lg border border-primary/20">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-4xl text-primary">fitness_center</span>
                    <div>
                      <div className="font-headline-md text-xl uppercase leading-none mb-1 font-semibold">Punch Count</div>
                      <div className="font-body-md text-xs opacity-70">Detected punches in this live session.</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-headline-display text-5xl text-primary font-extrabold">
                      {metrics?.punchCount ?? 0}
                    </div>
                    <button
                      type="button"
                      className="pointer-events-auto rounded-lg border border-primary/30 bg-surface-container-low/80 p-2 text-on-surface-variant backdrop-blur-md transition-all hover:bg-error-container hover:text-on-error-container active:scale-90"
                      title="Reset punch count"
                      onClick={() => liveCameraRef.current?.resetPunchCount()}
                    >
                      <span className="material-symbols-outlined text-xl">restart_alt</span>
                    </button>
                  </div>
                </div>

                {metrics?.isLive && (
                  <button
                    type="button"
                    className="pointer-events-auto mt-4 w-full bg-error text-on-error py-4 rounded-lg font-label-bold text-sm uppercase tracking-[0.3em] shadow-2xl transition-all hover:opacity-90 active:scale-[0.98]"
                    onClick={startRound}
                  >
                    <span className="material-symbols-outlined align-middle mr-2 text-lg">sports_mma</span>
                    Start 15s Round
                  </button>
                )}
              </div>
            )}

            {/* --- Error toast --- */}
            {sessionError && phase !== 'results' && (
              <div className="absolute bottom-4 left-4 right-4 z-50 bg-error-container/95 border border-error/40 rounded-lg px-4 py-2 font-label-bold text-[11px] text-on-error-container">
                {sessionError}
              </div>
            )}
          </div>
        </section>
        )}

      </main>

      {!embedded && (
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-safe bg-surface-container-low border-t border-surface-container-highest h-20 z-50 font-label-bold text-[10px] uppercase tracking-widest">
        <Link to="/dashboard" className="flex flex-col items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined">grid_view</span>
          <span>Home</span>
        </Link>
        <div className="flex flex-col items-center justify-center text-primary">
          <span className="material-symbols-outlined">fitness_center</span>
          <span>Train</span>
        </div>
        <Link to="/session" className="flex flex-col items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined">timeline</span>
          <span>Data</span>
        </Link>
        <span className="flex flex-col items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined">person</span>
          <span>User</span>
        </span>
      </nav>
      )}

      {!embedded && (
      <footer className="hidden md:block bg-surface-container-lowest w-full py-12 border-t border-surface-container-highest font-label-bold text-[10px] uppercase tracking-widest">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-primary font-black italic">PUNCHHARDER ELITE</div>
          <div className="flex gap-8 text-on-surface-variant">
            <span className="hover:text-primary transition-colors cursor-default">Hardware</span>
            <span className="hover:text-primary transition-colors cursor-default">Privacy</span>
            <span className="hover:text-primary transition-colors cursor-default">Terms</span>
            <span className="hover:text-primary transition-colors cursor-default">Research</span>
          </div>
          <div className="text-on-tertiary-container/30">© 2026 PUNCHHARDER ELITE. HIGH PERFORMANCE SYSTEMS.</div>
        </div>
      </footer>
      )}

      <DebugPanel
        phase={phase}
        sessionId={sessionId}
        clipIndex={sessionClipIndex}
        metrics={metrics}
        sessionResults={sessionResults}
        sessionError={sessionError}
      />
    </div>
  )
}
