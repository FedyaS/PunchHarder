import { Link } from 'react-router-dom'

const heatmapImg =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBxSxo1_HaztfkxqHnqZlReEZ9z0FQ0DAfTO_NcdN_1Lrfn1BaQTAvcydC66-GbsE4KssyhBCmz9QkiZlRkRFtFnnt0uZwxHX6yuJFIDpS8_fIt40mHn-WiTmxjG-3y_6-cJNMUP4JOl4ixZubV3PEIRS6UqlHajpRj-a9f1V9P5JJ5PZ1X6nKgRFRwJ2Hzmu5Gv3vmqyvPApTqThtL-bnlR-z9icXFGlEstQ_TQcKM_11miw1RSTfVDVP04d2JFpERSlxJUzHDbjQ'

const barHeights = [40, 60, 55, 75, 45, 90, 65, 40, 80, 95, 70, 50, 85, 60, 40]

export default function SessionSummaryPage() {
  return (
    <div className="bg-background text-on-background font-body-md selection:bg-primary-container selection:text-on-primary-container min-h-screen pb-32 md:pb-12">
      <header className="flex justify-between items-center px-6 py-4 w-full sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-surface-container-high">
        <Link to="/" className="text-2xl font-black italic tracking-widest text-primary font-headline-md uppercase tracking-tighter">
          PUNCHHARDER
        </Link>
        <nav className="hidden md:flex gap-8 items-center">
          <Link
            to="/dashboard"
            className="font-headline-md text-sm uppercase tracking-tighter text-on-tertiary-container hover:text-on-background transition-colors font-semibold"
          >
            Training
          </Link>
          <span className="font-headline-md text-sm uppercase tracking-tighter text-primary border-b-2 border-primary pb-1 font-semibold cursor-default">
            Analysis
          </span>
          <span className="font-headline-md text-sm uppercase tracking-tighter text-on-tertiary-container font-semibold cursor-default">
            History
          </span>
          <span className="font-headline-md text-sm uppercase tracking-tighter text-on-tertiary-container font-semibold cursor-default">
            Leaderboard
          </span>
        </nav>
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <span className="material-symbols-outlined text-on-tertiary-container hover:text-on-background cursor-pointer transition-all duration-200">
              notifications
            </span>
            <span className="material-symbols-outlined text-on-tertiary-container hover:text-on-background cursor-pointer transition-all duration-200">
              settings
            </span>
          </div>
          <Link
            to="/live"
            className="bg-primary text-on-primary font-headline-md font-black px-6 py-2 uppercase tracking-tighter active:scale-95 transition-transform rounded-lg"
          >
            GO LIVE
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 pb-32">
        <div className="mb-stack-lg">
          <div className="flex flex-col md:flex-row justify-between items-end gap-stack-md mb-stack-md">
            <div>
              <span className="font-label-bold text-label-bold text-on-primary-container mb-base block tracking-wide">SESSION COMPLETE</span>
              <h1 className="font-headline-lg text-headline-lg text-primary uppercase font-bold">HEAVY BAG ELITE #42</h1>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                className="border border-outline text-on-background font-label-bold px-8 py-4 hover:bg-surface-container-high transition-all active:scale-95 rounded-lg bg-transparent cursor-pointer"
              >
                SHARE STATS
              </button>
              <Link
                to="/live"
                className="bg-primary-container text-on-primary-container font-label-bold px-8 py-4 hover:bg-primary transition-all active:scale-95 rounded-lg shadow-lg text-center"
              >
                START NEW SESSION
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
            <div className="bg-surface-container border border-surface-container-highest p-stack-sm flex flex-col justify-between h-40 rounded-xl">
              <span className="font-label-bold text-label-bold text-on-tertiary-container">TOTAL PUNCHES</span>
              <span className="font-headline-display text-[48px] text-primary font-extrabold">842</span>
              <span className="text-secondary text-xs font-bold">+12% VS LAST</span>
            </div>
            <div className="bg-surface-container border border-surface-container-highest p-stack-sm flex flex-col justify-between h-40 rounded-xl">
              <span className="font-label-bold text-label-bold text-on-tertiary-container">AVG VELOCITY</span>
              <div className="flex items-baseline gap-1">
                <span className="font-headline-display text-[48px] text-primary font-extrabold">32.4</span>
                <span className="font-label-bold text-on-tertiary-container">M/S</span>
              </div>
              <div className="w-full h-1 bg-surface-container-highest overflow-hidden rounded-full">
                <div className="h-full bg-secondary w-[74%]" />
              </div>
            </div>
            <div className="bg-surface-container border border-surface-container-highest p-stack-sm flex flex-col justify-between h-40 rounded-xl">
              <span className="font-label-bold text-label-bold text-on-tertiary-container">MAX POWER</span>
              <div className="flex items-baseline gap-1">
                <span className="font-headline-display text-[48px] text-primary font-extrabold">1.2</span>
                <span className="font-label-bold text-on-tertiary-container">TONS</span>
              </div>
              <span className="text-on-tertiary-container text-xs uppercase font-bold italic">PEAK AT 12:42 MIN</span>
            </div>
            <div className="bg-surface-container border border-surface-container-highest p-stack-sm flex flex-col justify-between h-40 rounded-xl">
              <span className="font-label-bold text-label-bold text-on-tertiary-container">ACCURACY</span>
              <span className="font-headline-display text-[48px] text-primary font-extrabold">94%</span>
              <div className="flex gap-1">
                <div className="h-1 flex-1 bg-secondary rounded-full" />
                <div className="h-1 flex-1 bg-secondary rounded-full" />
                <div className="h-1 flex-1 bg-secondary rounded-full" />
                <div className="h-1 flex-1 bg-surface-container-highest rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-lg">
          <div className="lg:col-span-8 flex flex-col gap-stack-md">
            <div className="bg-surface-container border border-surface-container-highest p-stack-md relative overflow-hidden rounded-xl">
              <div className="flex justify-between items-center mb-stack-lg">
                <h3 className="font-headline-md text-headline-md text-primary uppercase font-semibold">VELOCITY TELEMETRY</h3>
                <div className="flex gap-4">
                  <span className="text-on-tertiary-container text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary" /> LEFT
                  </span>
                  <span className="text-on-tertiary-container text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-on-background" /> RIGHT
                  </span>
                </div>
              </div>
              <div className="h-80 w-full flex items-end gap-1 relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="border-t border-outline-variant w-full h-px" />
                  ))}
                </div>
                {barHeights.map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm hover:opacity-90 transition-colors ${i % 2 === 0 ? 'bg-secondary/20 hover:bg-secondary' : 'bg-on-background/20 hover:bg-on-background'}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="bg-surface-container border border-surface-container-highest p-stack-md rounded-xl">
              <div className="flex items-center gap-base mb-stack-lg">
                <span className="material-symbols-outlined text-secondary">psychology</span>
                <h3 className="font-headline-md text-headline-md text-primary uppercase font-semibold">AI FORM ANALYSIS</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                <div className="border-l-4 border-primary-container pl-stack-sm py-1">
                  <span className="font-label-bold text-on-tertiary-container text-xs block mb-base">CRITICAL INSIGHT</span>
                  <p className="font-body-lg text-on-background mb-base">Elbow flare detected on lead hook.</p>
                  <p className="font-body-md text-on-tertiary-container">
                    Keep your lead elbow tucked at a 90-degree angle to maximize torque and prevent telegraphing. You&apos;re losing ~14%
                    potential power on rotation.
                  </p>
                </div>
                <div className="border-l-4 border-secondary-container pl-stack-sm py-1">
                  <span className="font-label-bold text-on-tertiary-container text-xs block mb-base">RECOVERY PACE</span>
                  <p className="font-body-lg text-on-background mb-base">Stance reset speed: 0.8s (EXCEPTIONAL)</p>
                  <p className="font-body-md text-on-tertiary-container">
                    Your transition back to guard after heavy combinations is in the top 5% of your weight class. Maintain this defensive
                    hygiene.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-stack-md">
            <div className="bg-surface-container border border-surface-container-highest p-stack-md relative min-h-[480px] rounded-xl">
              <h3 className="font-label-bold text-label-bold text-on-tertiary-container mb-stack-lg uppercase">PLACEMENT HEATMAP</h3>
              <div className="relative w-full h-80 flex justify-center items-center">
                <img alt="" className="h-full object-contain opacity-40 grayscale brightness-50" src={heatmapImg} />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-16 h-16 bg-primary/40 blur-2xl rounded-full" />
                  <div className="absolute top-1/3 left-[45%] w-12 h-12 bg-secondary/60 blur-xl rounded-full" />
                  <div className="absolute top-1/2 left-[55%] w-14 h-14 bg-primary-container/30 blur-2xl rounded-full" />
                </div>
              </div>
              <div className="mt-stack-md space-y-base">
                <div className="flex justify-between font-label-bold text-xs">
                  <span className="text-on-tertiary-container">HEAD STRIKES</span>
                  <span className="text-on-background">62%</span>
                </div>
                <div className="h-1 bg-surface-container-highest w-full rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[62%] rounded-full" />
                </div>
                <div className="flex justify-between font-label-bold text-xs">
                  <span className="text-on-tertiary-container">BODY STRIKES</span>
                  <span className="text-on-background">38%</span>
                </div>
                <div className="h-1 bg-surface-container-highest w-full rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-[38%] rounded-full" />
                </div>
              </div>
            </div>

            <div className="bg-surface-container border border-surface-container-highest p-stack-md rounded-xl">
              <h3 className="font-label-bold text-label-bold text-on-tertiary-container mb-stack-md uppercase">STRIKE DISTRIBUTION</h3>
              <ul className="divide-y divide-surface-container-highest">
                {[
                  ['01', 'Jab (Lead)', '242 Reps'],
                  ['02', 'Cross (Power)', '188 Reps'],
                  ['03', 'Lead Hook', '112 Reps'],
                ].map(([num, name, reps]) => (
                  <li key={num} className="py-stack-sm flex justify-between items-center">
                    <div className="flex items-center gap-base">
                      <span className="text-primary font-black font-headline-md">{num}</span>
                      <span className="font-body-md text-on-background">{name}</span>
                    </div>
                    <span className="font-label-bold text-on-tertiary-container">{reps}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 w-full bg-black border-t border-surface-container-highest h-20 flex justify-around items-center px-4 pb-safe z-50 md:hidden shadow-[0_-4px_20px_rgba(98,17,0,0.1)]">
        <Link to="/dashboard" className="flex flex-col items-center justify-center text-on-tertiary-container">
          <span className="material-symbols-outlined">grid_view</span>
          <span className="font-headline-md text-[10px] font-bold uppercase tracking-widest mt-1">Dashboard</span>
        </Link>
        <Link to="/live" className="flex flex-col items-center justify-center text-on-tertiary-container">
          <span className="material-symbols-outlined">fitness_center</span>
          <span className="font-headline-md text-[10px] font-bold uppercase tracking-widest mt-1">Train</span>
        </Link>
        <div className="flex flex-col items-center justify-center text-primary bg-surface-container-low rounded-lg px-4 py-2 ring-1 ring-primary/30">
          <span className="material-symbols-outlined">timeline</span>
          <span className="font-headline-md text-[10px] font-bold uppercase tracking-widest mt-1">History</span>
        </div>
        <span className="flex flex-col items-center justify-center text-on-tertiary-container">
          <span className="material-symbols-outlined">person</span>
          <span className="font-headline-md text-[10px] font-bold uppercase tracking-widest mt-1">Profile</span>
        </span>
      </nav>

      <footer className="hidden md:block w-full py-12 border-t border-surface-container-highest bg-black">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-primary font-black font-headline-md text-xs uppercase tracking-widest">PUNCHHARDER ELITE AI. PRECISION PERFORMANCE.</div>
          <div className="flex gap-8">
            <span className="text-on-tertiary-container font-headline-md text-xs uppercase tracking-widest cursor-default">Hardware</span>
            <span className="text-on-tertiary-container font-headline-md text-xs uppercase tracking-widest cursor-default">Privacy</span>
            <span className="text-on-tertiary-container font-headline-md text-xs uppercase tracking-widest cursor-default">Terms</span>
            <span className="text-on-tertiary-container font-headline-md text-xs uppercase tracking-widest cursor-default">Research</span>
          </div>
          <div className="text-on-tertiary-container font-headline-md text-xs uppercase tracking-widest">© 2026 PUNCHHARDER</div>
        </div>
      </footer>
    </div>
  )
}
