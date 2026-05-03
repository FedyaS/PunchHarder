import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Replay from './pages/Replay'
import LiveAnalysisPage from './pages/LiveAnalysisPage.jsx'
import Eval from './pages/Eval'

function Home() {
  return (
    <main className="min-h-screen bg-background text-on-background font-body-md selection:bg-primary-container selection:text-on-primary-container">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-surface-container-highest bg-surface-container-low/80 p-6 shadow-2xl shadow-black/20">
          <p className="font-label-bold text-xs uppercase tracking-[0.35em] text-primary">
            PunchHarder
          </p>
          <h1 className="mt-3 font-headline-display text-4xl font-black uppercase tracking-tighter text-white sm:text-6xl">
            Live Analysis & Replay
          </h1>
          <p className="mt-4 max-w-3xl text-on-surface-variant">
            Train with the live analysis feed, then review detected punches and clips from the same one-page experience.
          </p>
        </header>

        <LiveAnalysisPage embedded />
        <Replay embedded />
      </div>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/eval" element={<Eval />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
