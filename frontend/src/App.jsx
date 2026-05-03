import LiveAnalysisPage from './pages/LiveAnalysisPage.jsx'
import { PixelWordmark } from './components/PixelWordmark.jsx'

export default function App() {
  return (
    <main className="min-h-screen bg-background text-on-background font-body-md selection:bg-primary-container selection:text-on-primary-container">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-8 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-low/80 p-6 shadow-2xl shadow-black/20">
          <div className="relative z-10 grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
            <div>
              <h1 className="mt-3 mb-5 max-w-3xl text-white leading-none">
                <PixelWordmark className="w-full max-w-[42rem]" />
              </h1>
              <p className="font-label-bold text-xs uppercase leading-relaxed tracking-[0.35em] text-primary">
                Live Analysis & Replay
              </p>

              <p className="mt-4 max-w-3xl text-on-surface-variant">
                Train with the live analysis feed, then review detected punches and clips from the same one-page experience.
              </p>
            </div>

            <div className="pointer-events-none relative hidden h-32 items-end justify-end gap-4 lg:flex" aria-hidden="true">
              <img
                src="/boxerleft_transparent.gif"
                alt=""
                className="h-full max-h-32 w-auto object-contain object-bottom opacity-95"
              />
              <img
                src="/boxerright.gif"
                alt=""
                className="h-full max-h-32 w-auto object-contain object-bottom opacity-95"
              />
            </div>
          </div>
        </header>

        <LiveAnalysisPage embedded />
      </div>
    </main>
  )
}
