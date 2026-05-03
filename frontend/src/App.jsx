import Replay from './pages/Replay'
import Label from './pages/Label'
import Classify from './pages/Classify'
import MarketingHomePage from './pages/MarketingHomePage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LiveAnalysisPage from './pages/LiveAnalysisPage.jsx'

export default function App() {
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
        <Route path="/" element={<MarketingHomePage />} />
        <Route path="/camera" element={<CameraHome />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/live" element={<LiveAnalysisPage />} />
        <Route path="/replay" element={<Replay />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/label" element={<Label />} />
        <Route path="/classify" element={<Classify />} />
        <Route path="/session" element={<SessionSummaryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
