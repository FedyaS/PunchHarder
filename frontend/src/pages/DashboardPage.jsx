import { Link } from 'react-router-dom'

const avatar =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCAhqEWLJMCGiYq2FP7pct1KrWzSSjVV-mbFUWgQK0IJJpohNnt9h9Nf6K97OL1qpaB5xJUawp4_egmZJZmxl_c2Ds6V8QRnEYBndVwHa-oPCr_CViGqw08vuf0NmPMDcFT0gaxsQN6gcE4b63fxRY_AspiMqyAiYbCx5PXHE9P3_YqomcnHrzLujAlTx1S-qmaUtJniPjaqPhFLkbRZdBhFck4nfySigpEU3YpYel5hFTArLF14q8sNaIFqOLUfu6ddIaOe5aGLJA'

const featuredImg =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA5Il4QOjsxDCiz4Ko23RC-WX2thqDdiOVmJYjr_GMiVZCfr_KiMF_h8pvhcNOxd5_C2TpE7qng6NZl_iZ3_yoIzNEWDfPdxhDrwgHytaYE4_HT_Otxgxc2BWaqDSQAKM2rppfKnZkVDDZKrVVl2cUceSNdHa5foEC-hHxCvE-5Y_6Mi4kcj7-orInZ_A5qg-SRmWZ3up9AY41VYTH7p8tPmbLj4gyLTWeIIUBIa35dqcraMg_L_P7cDy_9kA5xGjefd6GGhfpMfsY'

export default function DashboardPage() {
  return (
    <div className="bg-background text-on-background font-body-md overflow-x-hidden min-h-screen pb-20 md:pb-0">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex flex-col h-screen p-4 sticky top-0 bg-surface-container-low w-64 border-r border-outline-variant font-headline-md font-medium self-start">
          <Link to="/" className="text-primary font-black text-xl mb-8 font-headline-lg tracking-tighter block">
            PUNCHHARDER
          </Link>
          <div className="flex items-center gap-3 mb-8 p-3 bg-surface-container-high rounded-lg">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary">
              <img alt="User profile" className="w-full h-full object-cover" src={avatar} />
            </div>
            <div>
              <div className="text-on-surface text-[10px] font-bold uppercase tracking-widest font-label-bold">PRO ATHLETE</div>
              <div className="text-primary text-[10px] font-bold">Rank #124</div>
            </div>
          </div>
          <nav className="flex-1 space-y-1">
            <span className="flex items-center gap-3 px-4 py-3 bg-primary-container text-on-primary-container font-bold rounded-lg transition-all duration-300 ease-in-out cursor-default">
              <span className="material-symbols-outlined">dashboard</span>
              <span className="font-headline-md text-sm">Overview</span>
            </span>
            <Link
              to="/live"
              className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-300 ease-in-out"
            >
              <span className="material-symbols-outlined">videocam</span>
              <span className="font-headline-md text-sm">Live Feed</span>
            </Link>
            <span className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-300 ease-in-out cursor-pointer">
              <span className="material-symbols-outlined">insert_chart</span>
              <span className="font-headline-md text-sm">Analytics</span>
            </span>
            <span className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-300 ease-in-out cursor-pointer">
              <span className="material-symbols-outlined">sports_kabaddi</span>
              <span className="font-headline-md text-sm">Drills</span>
            </span>
            <span className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-300 ease-in-out cursor-pointer">
              <span className="material-symbols-outlined">settings</span>
              <span className="font-headline-md text-sm">Settings</span>
            </span>
          </nav>
          <Link
            to="/live"
            className="mt-auto w-full bg-primary text-on-primary font-bold py-4 rounded-lg active:scale-95 transition-transform uppercase font-label-bold tracking-tight hover:brightness-110 text-center block"
          >
            START SESSION
          </Link>
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="flex justify-between items-center px-6 py-4 w-full sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-outline-variant">
            <Link to="/" className="text-2xl font-black italic tracking-widest text-primary font-headline-lg uppercase lg:hidden block">
              PUNCHHARDER
            </Link>
            <div className="hidden lg:flex items-center gap-8">
              <span className="text-primary border-b-2 border-primary pb-1 font-headline-md text-sm uppercase tracking-tighter cursor-default">
                Training
              </span>
              <Link
                to="/live"
                className="text-on-surface-variant hover:text-primary transition-colors font-headline-md text-sm uppercase tracking-tighter"
              >
                Analysis
              </Link>
              <Link
                to="/session"
                className="text-on-surface-variant hover:text-primary transition-colors font-headline-md text-sm uppercase tracking-tighter"
              >
                History
              </Link>
              <span className="text-on-surface-variant hover:text-primary transition-colors font-headline-md text-sm uppercase tracking-tighter cursor-default">
                Leaderboard
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/live"
                className="hidden md:inline-block bg-secondary-container text-on-secondary-container px-6 py-2 font-bold font-headline-md text-sm uppercase tracking-tighter rounded-lg active:scale-95 transition-transform text-center"
              >
                GO LIVE
              </Link>
              <button type="button" className="text-on-surface-variant material-symbols-outlined hover:bg-surface-container-high p-2 rounded-full transition-all border-0 bg-transparent cursor-pointer">
                notifications
              </button>
              <button type="button" className="text-on-surface-variant material-symbols-outlined hover:bg-surface-container-high p-2 rounded-full transition-all border-0 bg-transparent cursor-pointer">
                settings
              </button>
            </div>
          </header>

          <div className="p-6 md:p-margin flex flex-col gap-stack-md">
            <div className="lg:hidden">
              <Link
                to="/live"
                className="block w-full bg-primary text-on-primary font-bold py-6 font-headline-md uppercase tracking-widest active:scale-95 transition-transform rounded-lg shadow-lg text-center"
              >
                START LIVE SESSION
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
              <div className="md:col-span-8 bg-surface-container border border-outline-variant p-stack-md rounded-xl flex flex-col justify-between min-h-[320px]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-label-bold text-on-surface-variant text-xs mb-2">AVERAGE PUNCH VELOCITY</p>
                    <h2 className="font-headline-lg text-on-surface font-bold">
                      42.8 <span className="text-primary font-headline-md font-semibold">M/S</span>
                    </h2>
                  </div>
                  <div className="text-primary flex items-center gap-1 font-bold">
                    <span className="material-symbols-outlined">trending_up</span>+12%
                  </div>
                </div>
                <div className="h-32 flex items-end gap-2">
                  {[20, 40, 35, 60, 55, 85, 95, 70, 50, 65].map((pct, idx) => (
                    <div
                      key={pct}
                      className={`flex-1 rounded-t-lg ${
                        idx === 5
                          ? 'bg-primary-container shadow-[0_0_15px_rgba(98,17,0,0.3)]'
                          : idx === 6
                            ? 'bg-primary shadow-[0_0_15px_rgba(255,180,162,0.5)]'
                            : 'bg-surface-container-highest'
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="md:col-span-4 bg-surface-container border border-primary/30 p-stack-md rounded-xl flex flex-col">
                <p className="font-label-bold text-primary text-xs mb-4">TECHNIQUE SCORE</p>
                <div className="flex-1 flex flex-col justify-center items-center">
                  <span className="font-headline-display text-on-surface font-extrabold">92</span>
                  <p className="font-label-bold text-on-surface-variant text-xs">ELITE LEVEL</p>
                </div>
                <div className="segmented-progress mt-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className={i < 9 ? 'active' : ''} />
                  ))}
                </div>
              </div>

              <div className="md:col-span-12 lg:col-span-4 bg-surface-container border border-outline-variant p-stack-md rounded-xl">
                <div className="flex justify-between items-center mb-6">
                  <p className="font-label-bold text-on-surface text-xs">WEEKLY ACTIVITY</p>
                  <span className="text-on-surface-variant text-[10px] font-label-sm">OCT 14 - OCT 20</span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end h-24 gap-2">
                    {[40, 60, 90, 30, 75, 100, 10].map((h) => (
                      <div key={h} className="flex-1 bg-surface-container-low relative rounded-sm overflow-hidden">
                        <div
                          className={`absolute bottom-0 w-full ${h >= 90 ? 'bg-primary' : 'bg-outline-variant'}`}
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-on-surface-variant font-bold font-label-bold">
                    <span>MON</span>
                    <span>TUE</span>
                    <span>WED</span>
                    <span>THU</span>
                    <span>FRI</span>
                    <span>SAT</span>
                    <span>SUN</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-12 lg:col-span-8 bg-surface-container border border-outline-variant p-stack-md rounded-xl">
                <div className="flex justify-between items-center mb-6">
                  <p className="font-label-bold text-on-surface text-xs">RECENT SESSIONS</p>
                  <Link to="/session" className="text-primary text-[10px] font-bold hover:underline font-label-bold">
                    VIEW ALL
                  </Link>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: 'fitness_center', title: 'Heavy Bag Power Drill', meta: 'Today, 08:42 AM • 45 min', force: '842', prec: '94%' },
                    { icon: 'sports_kabaddi', title: 'Shadow Boxing Reflex', meta: 'Yesterday, 06:15 PM • 30 min', force: '312', prec: '88%' },
                  ].map((s) => (
                    <div
                      key={s.title}
                      className="group flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-transparent hover:border-primary/50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 flex items-center justify-center bg-surface-container-highest text-primary rounded-lg">
                          <span className="material-symbols-outlined">{s.icon}</span>
                        </div>
                        <div>
                          <p className="font-headline-md text-on-surface text-sm font-semibold">{s.title}</p>
                          <p className="text-xs text-on-surface-variant font-body-md">{s.meta}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="hidden sm:block text-right">
                          <p className="text-[10px] text-on-surface-variant font-label-bold uppercase">AVG FORCE</p>
                          <p className="font-bold text-on-surface font-headline-md text-sm">
                            {s.force} <span className="text-on-surface-variant text-[10px]">PSI</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-on-surface-variant font-label-bold uppercase">PRECISION</p>
                          <p className="font-bold text-primary font-headline-md text-sm">{s.prec}</p>
                        </div>
                        <span className="material-symbols-outlined text-outline-variant group-hover:text-on-surface transition-colors">
                          chevron_right
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden p-stack-lg rounded-2xl flex flex-col justify-end min-h-[400px] border border-outline-variant">
              <div className="absolute inset-0 z-0">
                <img alt="" className="w-full h-full object-cover grayscale opacity-40" src={featuredImg} />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              </div>
              <div className="relative z-10 max-w-2xl">
                <span className="inline-block bg-primary text-on-primary px-3 py-1 font-label-bold text-[10px] rounded mb-4">RECOMMENDED DRILL</span>
                <h2 className="font-headline-lg text-on-surface mb-2 italic uppercase font-bold">EXPLOSIVE COUNTER-STRIKE</h2>
                <p className="text-body-lg text-on-surface-variant mb-8 font-light font-body-lg">
                  Optimize your reaction window and kinetic chain transfer with our AI-guided reactive pad session.
                </p>
                <Link
                  to="/live"
                  className="inline-block bg-primary text-on-primary px-10 py-4 font-bold font-headline-md text-sm uppercase tracking-tighter rounded-lg hover:brightness-110 transition-colors text-center"
                >
                  LAUNCH PROGRAM
                </Link>
              </div>
            </div>
          </div>

          <footer className="bg-surface-container-lowest mt-auto w-full py-12 border-t border-outline-variant">
            <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-primary font-black font-headline-md text-xs uppercase tracking-widest">PUNCHHARDER AI. PRECISION PERFORMANCE SYSTEMS.</div>
              <div className="flex gap-8">
                <span className="text-on-surface-variant font-headline-md text-[10px] uppercase tracking-widest cursor-default">Hardware</span>
                <span className="text-on-surface-variant font-headline-md text-[10px] uppercase tracking-widest cursor-default">Privacy</span>
                <span className="text-on-surface-variant font-headline-md text-[10px] uppercase tracking-widest cursor-default">Terms</span>
                <span className="text-on-surface-variant font-headline-md text-[10px] uppercase tracking-widest cursor-default">Research</span>
              </div>
              <div className="text-outline-variant font-headline-md text-[10px] uppercase tracking-widest">© 2026</div>
            </div>
          </footer>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-safe bg-surface-container-lowest border-t border-outline-variant z-50 h-20">
        <span className="flex flex-col items-center justify-center text-primary font-headline-md text-[10px] font-bold uppercase tracking-widest cursor-default">
          <span className="material-symbols-outlined mb-1">grid_view</span>
          Dashboard
        </span>
        <Link to="/live" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all font-headline-md text-[10px] font-bold uppercase tracking-widest">
          <span className="material-symbols-outlined mb-1">fitness_center</span>
          Train
        </Link>
        <Link to="/session" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all font-headline-md text-[10px] font-bold uppercase tracking-widest">
          <span className="material-symbols-outlined mb-1">timeline</span>
          History
        </Link>
        <span className="flex flex-col items-center justify-center text-on-surface-variant font-headline-md text-[10px] font-bold uppercase tracking-widest">
          <span className="material-symbols-outlined mb-1">person</span>
          Profile
        </span>
      </nav>
    </div>
  )
}
