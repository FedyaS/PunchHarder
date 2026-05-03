import { Link } from 'react-router-dom'

const heroImg =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBsbQv113hZW5MdcqBnXT2DkXCN2eb0-_pIak0xOLtJ_-q-VCByC1D6OBFIs1zrZWCUhYcO56UHucIDJK9RIL2XIO6vKEcguGPPuPZlYz2yyMsp-W4sL61EMuYWmdYZ9MDRbhQ9HT0ILHcdSfPqOyHJTeC_6EX1G3xMbSJLn222m2kNqf6HDY7R8PN7n1gaP29vRiAuyEX_eFyWUwewcGmdSAqGGIMi_08VOkboZffUXPihgcSGo39LcVNrwaXomuL8d4cc5LsqOFw'

const formImg =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBXxjGbwIB4PZlxgp6YOe-LsNbN9iy16RKZY--GBhGB856TbjA8e3nGX4Kl6VeyLyqK6UbIlHq-ISQL79yEcdHfkayeNn1lTXyWoVLUPGwAPA4HS9GrU74Es-87Kj5CeLosNUHMq6Dv6V_abYAQrNWDOqPIcj_7KIcbWa6MAUBmGNkqeB7APrvxcFON9JTeEoPO0_LWUnj__boaMkRZTLS8_2WoAZ4U5-Y7TlE5QJ2Q8xJDn6g030P6jEO1LiK7HB3-R1VvkpekIMQ'

const t1 =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB9qIOdiMykB2_xUvBLaUsxQ31Uw61oUY6cbQnFTyUiP4WukqorNBvf9gS8etOa-aBwZJL4I9431zNkivPV1PM_ihUampYz2470uLmGXlzsxodI6dWAzeSx0wdEPFBNUhVEVTZKiLxWpZjM0phiwcfYxUCUFHXngwSmFxrftmXKHXG9IfHjfDNMiu9XbGvJZcwp22zbDPhlwRCvefROQvtAbT4ziFeOQn_aHcaMt_0L8Zt2FQnlMPFYPD_Simt40W0VduLv2qnofFg'

const t2 =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDupZxAqw_HJElQb5xqwuGEgVaCamOm3eqSXLyj_cMlvOLr8jteEjSPqV2xhO1akmisEaid_H-skw-ns7y75vWpjYPRUopi6sOMxrJV4826QtVdu7XSiIaQBxTlg9f6Iqa47bLlMmWJNMJ-OA_TEgnrSi7WSX-XNxKzfLoOJka9P7UJwgocKi0um1uY3zAoB9W3vZcZwTYjl5er_7BweCw4AfqBgmZlUjtRn7jYwtOOSfEL_x7udJ9lQELnxqsg93dSHc_RtUgiZag'

const t3 =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDYAE-LvGa6o1e9-6e3DH6s-DDYkU-n9N3X_Uhlaa6o0dWUCwwq6RsYSNW9GY6Vi1L4iec2i9NYxqq7n7EjW3HbdMBVIGp4skzfzQeLZPx5BjN3pRw_yKxmikOpZrR6WnM0GHp0FTshUwKDVYVviUE1jlA6usrdwOjFa3L2c5HF8ig5V9TDVLUx637Vu7M9-MWQDsaLc8bVIH7mDrA-pBEZwaO3Afq99_zfu-h831h7QJXEJ2ap1Zrgs02NUpAmI0LjokPYtrOhAfs'

export default function MarketingHomePage() {
  return (
    <div className="bg-background text-on-background font-body-md selection:bg-primary-container selection:text-on-primary-container min-h-screen pb-20 md:pb-0">
      <header className="bg-black/90 backdrop-blur-xl border-b border-surface-container-highest flex justify-between items-center px-6 py-4 w-full sticky top-0 z-50">
        <div className="text-2xl font-headline-md italic tracking-widest text-on-primary-container font-headline-display uppercase">
          PUNCHHARDER
        </div>
        <nav className="hidden md:flex gap-8">
          <Link
            className="text-on-primary-container border-b-2 border-primary-container pb-1 font-label-bold uppercase tracking-tighter"
            to="/dashboard"
          >
            Training
          </Link>
          <Link
            className="text-on-tertiary-container hover:text-white transition-colors font-label-bold uppercase tracking-tighter"
            to="/live"
          >
            Analysis
          </Link>
          <Link
            className="text-on-tertiary-container hover:text-white transition-colors font-label-bold uppercase tracking-tighter"
            to="/session"
          >
            History
          </Link>
          <span className="text-on-tertiary-container font-label-bold uppercase tracking-tighter cursor-default">
            Leaderboard
          </span>
        </nav>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-on-tertiary-container hover:text-white cursor-pointer">
            notifications
          </span>
          <span className="material-symbols-outlined text-on-tertiary-container hover:text-white cursor-pointer">
            settings
          </span>
          <Link
            to="/live"
            className="bg-primary-container text-on-primary hover:bg-on-primary-container transition-colors font-label-bold px-6 py-2 active:scale-95 transition-transform uppercase tracking-widest inline-block text-center"
          >
            GO LIVE
          </Link>
        </div>
      </header>

      <main>
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              alt=""
              className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-700"
              src={heroImg}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
          </div>
          <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-block px-4 py-1 bg-secondary-container text-on-secondary-container font-label-bold text-label-sm uppercase rounded-full">
                AI-POWERED BIOMETRICS
              </div>
              <h1 className="font-headline-display text-headline-lg lg:text-headline-display text-white uppercase leading-[0.9] tracking-tighter font-extrabold">
                BREAK THROUGH THE <span className="text-on-primary-container italic">PLATEAU.</span>
              </h1>
              <p className="font-body-lg text-on-tertiary-container max-w-lg">
                Precision engineering for human combat. Analyze every punch with sub-millisecond accuracy using our
                proprietary neural vision engine.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/live"
                  className="bg-primary-container text-on-primary font-headline-md font-bold text-label-bold px-8 py-4 rounded-lg hover:bg-on-primary-container transition-all glow-primary uppercase inline-block text-center"
                >
                  Try It Live
                </Link>
                <button
                  type="button"
                  className="border border-outline-variant bg-surface-container-high/50 backdrop-blur-md text-white font-headline-md font-bold text-label-bold px-8 py-4 rounded-lg hover:bg-surface-bright transition-all uppercase"
                >
                  View Hardware
                </button>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-4">
              <div className="bg-surface-container border border-outline-variant p-6 backdrop-blur-md rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-on-tertiary-container font-label-bold text-xs">VELOCITY</span>
                  <span className="material-symbols-outlined text-on-primary-container">speed</span>
                </div>
                <div className="font-headline-display text-headline-lg text-on-primary-container font-extrabold">34.2</div>
                <div className="text-on-tertiary-container font-label-bold text-xs">M/S PEAK FORCE</div>
              </div>
              <div className="bg-surface-container border border-outline-variant p-6 backdrop-blur-md mt-8 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-on-tertiary-container font-label-bold text-xs">PRECISION</span>
                  <span className="material-symbols-outlined text-secondary">target</span>
                </div>
                <div className="font-headline-display text-headline-lg text-secondary font-extrabold">98%</div>
                <div className="text-on-tertiary-container font-label-bold text-xs">ACCURACY RATING</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-stack-lg container mx-auto px-6">
          <div className="mb-stack-md">
            <h2 className="font-headline-lg text-headline-md text-white uppercase mb-2 font-bold">Technical Superiority</h2>
            <div className="w-20 h-1 bg-primary-container" />
          </div>
          <div className="grid md:grid-cols-12 gap-gutter">
            <div className="md:col-span-8 bg-surface-container-high border border-outline-variant relative group overflow-hidden h-96 rounded-lg">
              <img
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
                src={formImg}
              />
              <div className="absolute inset-0 p-8 flex flex-col justify-end bg-gradient-to-t from-background to-transparent">
                <h3 className="font-headline-md text-headline-md text-white uppercase mb-2 font-semibold">Live Form Correction</h3>
                <p className="text-on-tertiary-container max-w-md font-body-md">
                  AI vision tracks 17 kinetic points in real-time to optimize your kinetic chain and prevent injury.
                </p>
              </div>
            </div>
            <div className="md:col-span-4 bg-primary-container p-8 flex flex-col justify-between text-on-primary rounded-lg">
              <span className="material-symbols-outlined text-4xl">timeline</span>
              <div>
                <h3 className="font-headline-md text-headline-md uppercase leading-none mb-4 font-semibold">Velocity Tracking</h3>
                <p className="font-body-md font-bold">
                  Every millimeter of movement recorded at 120 FPS. Measure acceleration curves for every jab, hook, and cross.
                </p>
              </div>
            </div>
            <div className="md:col-span-4 bg-surface-container-low border border-outline-variant p-8 flex flex-col gap-6 rounded-lg">
              <span className="material-symbols-outlined text-secondary text-4xl">sports_kabaddi</span>
              <h3 className="font-headline-md text-headline-md text-white uppercase font-semibold">Personalized Drills</h3>
              <p className="text-on-tertiary-container font-body-md">
                Neural algorithms adapt your training load based on fatigue markers and metabolic recovery rates.
              </p>
            </div>
            <div className="md:col-span-8 bg-surface-container border border-outline-variant overflow-hidden relative group rounded-lg">
              <div className="p-8 grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="font-headline-md text-headline-md text-white uppercase mb-4 font-semibold">Data-Driven Domination</h3>
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-on-background">
                      <span className="material-symbols-outlined text-on-primary-container">check_circle</span>
                      Sync with wearables
                    </li>
                    <li className="flex items-center gap-3 text-on-background">
                      <span className="material-symbols-outlined text-on-primary-container">check_circle</span>
                      Pro-athlete benchmarking
                    </li>
                    <li className="flex items-center gap-3 text-on-background">
                      <span className="material-symbols-outlined text-on-primary-container">check_circle</span>
                      AR-Integrated Shadowboxing
                    </li>
                  </ul>
                </div>
                <div className="relative h-48 bg-surface-container-highest rounded-lg flex items-center justify-center border border-outline-variant">
                  <div className="flex gap-1 h-32 items-end">
                    <div className="w-4 bg-primary-container h-1/2" />
                    <div className="w-4 bg-on-primary-container h-3/4" />
                    <div className="w-4 bg-primary-container h-1/3" />
                    <div className="w-4 bg-secondary-container h-full" />
                    <div className="w-4 bg-primary-container h-2/3" />
                    <div className="w-4 bg-secondary h-4/5" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <span className="font-label-bold text-on-primary-container border border-primary-container px-4 py-1">SECURE ANALYSIS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface-container-lowest py-stack-lg">
          <div className="container mx-auto px-6">
            <div className="text-center mb-stack-md">
              <h2 className="font-headline-md text-headline-md text-white uppercase font-semibold">The Elite Standard</h2>
              <p className="text-on-tertiary-container font-label-bold">TRUSTED BY WORLD CHAMPIONS</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[t1, t2, t3].map((src, i) => (
                <div
                  key={src}
                  className="bg-surface-container p-8 border border-outline-variant relative group rounded-lg"
                >
                  <div className="absolute -top-4 -left-4 text-primary-container opacity-20">
                    <span className="material-symbols-outlined text-6xl">format_quote</span>
                  </div>
                  <p className="font-body-lg text-white mb-8 italic relative z-10">
                    {i === 0 &&
                      `"The precision telemetry changed my entire approach to fight camp. I no longer guess if I'm ready; I have the data."`}
                    {i === 1 &&
                      `"PunchHarder's form correction is like having my head coach in the gym 24/7. It's the future of the sport."`}
                    {i === 2 &&
                      `"The velocity tracking allowed us to isolate fatigue points we never saw on film. A total game changer."`}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-surface-container-highest rounded-lg overflow-hidden border border-outline-variant">
                      <img alt="" className="w-full h-full object-cover" src={src} />
                    </div>
                    <div>
                      <h4 className="font-label-bold text-white text-sm">
                        {['MARCUS RIVERA', 'SARAH CHEN', 'COACH ELIAS'][i]}
                      </h4>
                      <p className="text-on-tertiary-container text-xs font-label-bold">
                        {['WBO LIGHTWEIGHT CHAMP', 'GOLD MEDALIST, TOKYO', 'HEAD STRIKING COACH, ATT'][i]}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-stack-lg relative">
          <div className="absolute inset-0 z-0">
            <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-container/20 via-transparent to-transparent" />
          </div>
          <div className="container mx-auto px-6 text-center relative z-10">
            <h2 className="font-headline-display text-headline-lg lg:text-headline-display text-white uppercase mb-8 max-w-4xl mx-auto font-extrabold">
              Ready to outwork the <span className="text-on-primary-container">competition?</span>
            </h2>
            <div className="flex flex-col md:flex-row justify-center gap-6">
              <button
                type="button"
                className="bg-primary-container text-on-primary font-headline-md font-bold text-label-bold px-12 py-6 rounded-lg hover:bg-on-primary-container hover:shadow-[0_0_30px_rgba(98,17,0,0.6)] transition-all uppercase"
              >
                Start Free Trial
              </button>
              <button
                type="button"
                className="border-2 border-white text-white font-headline-md font-bold text-label-bold px-12 py-6 rounded-lg hover:bg-white hover:text-black transition-all uppercase"
              >
                Request Demo
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-surface-container-lowest w-full py-12 border-t border-surface-container-high">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-4 items-center md:items-start">
            <div className="text-on-primary-container font-headline-md text-2xl uppercase tracking-widest font-semibold">PUNCHHARDER</div>
            <p className="text-on-tertiary-container font-body-md text-xs uppercase tracking-widest">
              © 2026 PUNCHHARDER AI. PRECISION PERFORMANCE SYSTEMS.
            </p>
          </div>
          <nav className="flex gap-8">
            <span className="text-on-tertiary-container font-label-bold text-xs uppercase tracking-widest cursor-default">Hardware</span>
            <span className="text-on-tertiary-container font-label-bold text-xs uppercase tracking-widest cursor-default">Privacy</span>
            <span className="text-on-tertiary-container font-label-bold text-xs uppercase tracking-widest cursor-default">Terms</span>
            <span className="text-on-tertiary-container font-label-bold text-xs uppercase tracking-widest cursor-default">Research</span>
          </nav>
          <div className="flex gap-4">
            <span className="material-symbols-outlined text-on-tertiary-container hover:text-white cursor-pointer">public</span>
            <span className="material-symbols-outlined text-on-tertiary-container hover:text-white cursor-pointer">share</span>
          </div>
        </div>
      </footer>

      <div className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-safe bg-background border-t border-surface-container-highest h-20 z-50 shadow-[0_-4px_20px_rgba(98,17,0,0.1)]">
        <Link
          to="/dashboard"
          className="flex flex-col items-center justify-center text-on-primary-container bg-surface-container rounded-lg px-4 py-2 ring-1 ring-primary-container/30 active:scale-90 duration-150"
        >
          <span className="material-symbols-outlined">grid_view</span>
          <span className="font-label-bold text-[10px] uppercase tracking-widest">Dashboard</span>
        </Link>
        <Link to="/live" className="flex flex-col items-center justify-center text-on-tertiary-container hover:text-white transition-all active:scale-90 duration-150">
          <span className="material-symbols-outlined">fitness_center</span>
          <span className="font-label-bold text-[10px] uppercase tracking-widest">Train</span>
        </Link>
        <Link to="/session" className="flex flex-col items-center justify-center text-on-tertiary-container hover:text-white transition-all active:scale-90 duration-150">
          <span className="material-symbols-outlined">timeline</span>
          <span className="font-label-bold text-[10px] uppercase tracking-widest">History</span>
        </Link>
        <span className="flex flex-col items-center justify-center text-on-tertiary-container active:scale-90 duration-150">
          <span className="material-symbols-outlined">person</span>
          <span className="font-label-bold text-[10px] uppercase tracking-widest">Profile</span>
        </span>
      </div>
    </div>
  )
}
