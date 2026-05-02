import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LiveCamera } from '../components/LiveCamera.jsx'

function sensorsLabel(metrics) {
  if (!metrics) return 'STANDBY'
  if (metrics.error || metrics.trackingError) return 'CHECK FEED'
  if (metrics.poseCount > 0) return 'TRACKING'
  if (metrics.isLive) return 'OPTIMAL'
  return 'STANDBY'
}

export default function LiveAnalysisPage() {
  const liveCameraRef = useRef(null)
  const [metrics, setMetrics] = useState(null)
  const handleMetrics = useCallback((next) => {
    setMetrics(next)
  }, [])
  return (
    <div className="bg-background text-on-background font-body-md selection:bg-primary-container selection:text-on-primary-container min-h-screen flex flex-col pb-20 md:pb-0">
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

      <main className="flex-grow flex flex-col lg:flex-row h-[calc(100vh-144px)] lg:h-[calc(100vh-72px)] overflow-hidden">
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

        <section className="flex-grow relative bg-black flex flex-col min-h-[40vh]">
          <div className="flex-grow relative overflow-hidden group min-h-[280px] flex flex-col">
            <LiveCamera ref={liveCameraRef} embedded onMetrics={handleMetrics} className="min-h-[280px] flex-1" />
            <div className="pointer-events-none absolute top-8 left-8 z-30 flex flex-col gap-2">
              <div className="bg-surface-container-low/80 backdrop-blur-md px-4 py-2 border-l-4 border-primary flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${metrics?.isLive ? 'bg-error animate-pulse' : 'bg-on-surface-variant'}`}
                />
                <span className="font-label-bold text-[10px] text-on-surface uppercase tracking-widest">
                  {metrics?.isLive ? 'LIVE ANALYSIS ACTIVE' : 'LIVE ANALYSIS STANDBY'}
                </span>
              </div>
              <div className="bg-surface-container-low/80 backdrop-blur-md px-4 py-2 border-l-4 border-secondary flex items-center gap-2">
                <span className="font-label-bold text-[10px] text-secondary uppercase tracking-widest">
                  SENSORS: {sensorsLabel(metrics)}
                </span>
              </div>
              {metrics?.isLive && (
                <div className="bg-surface-container-low/80 backdrop-blur-md px-4 py-2 border-l-4 border-primary/60 flex items-center gap-2 pointer-events-auto">
                  <span className="font-label-bold text-[10px] text-on-surface-variant uppercase tracking-widest">
                    Poses in frame:{' '}
                    <span className="font-mono text-primary">{metrics.poseCount ?? 0}</span>
                  </span>
                </div>
              )}
            </div>
            <div className="absolute bottom-12 left-1/2 z-20 -translate-x-1/2 w-full max-w-xl px-4 pointer-events-none">
              <div className="bg-primary-container text-on-primary-container p-6 flex items-center justify-between shadow-2xl rounded-lg border border-primary/20">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-4xl text-primary">bolt</span>
                  <div>
                    <div className="font-headline-md text-xl uppercase leading-none mb-1 font-semibold">EXTEND YOUR JAB</div>
                    <div className="font-body-md text-xs opacity-70">Full extension required for maximum velocity.</div>
                  </div>
                </div>
                <div className="font-headline-display text-4xl text-primary font-extrabold">84%</div>
              </div>
            </div>
          </div>

          <div className="lg:hidden grid grid-cols-3 gap-1 p-2 bg-surface-container-low">
            <div className="bg-surface-container-high p-3 flex flex-col items-center">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase font-label-bold">VELOCITY</span>
              <span className="text-xl font-bold text-primary">12.4</span>
            </div>
            <div className="bg-surface-container-high p-3 flex flex-col items-center">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase font-label-bold">ACCURACY</span>
              <span className="text-xl font-bold text-secondary">92</span>
            </div>
            <div className="bg-surface-container-high p-3 flex flex-col items-center">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase font-label-bold">STREAK</span>
              <span className="text-xl font-bold text-on-surface">42</span>
            </div>
          </div>
        </section>

        <aside className="w-full lg:w-96 bg-surface-container-low border-l border-surface-container-highest p-6 flex flex-col gap-6 overflow-y-auto max-h-[50vh] lg:max-h-none">
          <div className="bg-surface-container-high p-5 border border-surface-container-highest relative overflow-hidden rounded-lg">
            <div className="absolute top-0 right-0 p-2 opacity-5 text-primary">
              <span className="material-symbols-outlined text-6xl">speed</span>
            </div>
            <div className="font-label-bold text-[10px] text-on-surface-variant mb-2 uppercase tracking-widest">PUNCH VELOCITY</div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-display text-5xl text-primary font-extrabold">12.4</span>
              <span className="font-label-bold text-xs text-on-surface-variant">M/S</span>
            </div>
            <div className="mt-4 flex gap-1 h-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`flex-grow ${i < 6 ? 'bg-primary' : 'bg-surface-container-highest'}`} />
              ))}
            </div>
            <div className="mt-2 text-[10px] text-on-surface-variant font-bold uppercase tracking-widest text-right font-label-bold">
              PEAK: 14.8 M/S
            </div>
          </div>

          <div className="bg-surface-container-high p-5 border border-surface-container-highest rounded-lg">
            <div className="font-label-bold text-[10px] text-on-surface-variant mb-2 uppercase tracking-widest">FORM ACCURACY</div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-display text-5xl text-secondary font-extrabold">92</span>
              <span className="font-label-bold text-xs text-on-surface-variant">%</span>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              {[
                { label: 'Balance', pct: 98 },
                { label: 'Rotation', pct: 86 },
              ].map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-on-surface-variant font-label-bold">
                    <span>{row.label}</span>
                    <span className="text-on-surface">{row.pct}%</span>
                  </div>
                  <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-high p-5 flex justify-between items-center border border-surface-container-highest rounded-lg">
            <div>
              <div className="font-label-bold text-[10px] text-on-surface-variant mb-1 uppercase tracking-widest">LIVE STREAK</div>
              <div className="font-headline-display text-5xl text-on-surface font-extrabold">42</div>
            </div>
            <div className="w-16 h-16 rounded-full border-2 border-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_fire_department
              </span>
            </div>
          </div>

          <div className="flex-grow flex flex-col gap-3 min-h-0">
            <div className="font-label-bold text-[10px] text-on-surface-variant mb-2 uppercase tracking-widest">REAL-TIME LOG</div>
            <div className="space-y-2">
              {[
                { t: '08:42:12', m: 'Power Hook', v: '+120', border: 'border-surface-container-highest' },
                { t: '08:42:15', m: 'Snap wrist', v: 'TIP', border: 'border-primary', bold: true },
                { t: '08:42:18', m: '1-2-3-2', v: 'EXC', border: 'border-secondary', sec: true },
              ].map((row) => (
                <div
                  key={row.t}
                  className={`bg-surface-container-low p-3 text-[11px] flex justify-between items-center border-l-2 ${row.border} font-label-bold rounded-sm`}
                >
                  <span className="text-on-surface-variant">{row.t}</span>
                  <span className="text-on-surface uppercase">{row.m}</span>
                  <span className={row.sec ? 'text-secondary' : row.bold ? 'text-primary font-bold' : 'text-primary'}>{row.v}</span>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/session"
            className="w-full lg:hidden bg-error-container text-on-error-container font-bold py-4 active:scale-95 transition-transform uppercase tracking-widest text-[10px] font-label-bold rounded-lg text-center block"
          >
            STOP SESSION
          </Link>
        </aside>
      </main>

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
    </div>
  )
}
