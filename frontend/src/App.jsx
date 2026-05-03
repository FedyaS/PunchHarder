import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { LiveCamera } from './components/LiveCamera'
import Analysis from './pages/Analysis'
import Replay from './pages/Replay'
import Label from './pages/Label'
import MarketingHomePage from './pages/MarketingHomePage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LiveAnalysisPage from './pages/LiveAnalysisPage.jsx'
import SessionSummaryPage from './pages/SessionSummaryPage.jsx'

function CameraHome() {
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            Live boxing camera
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-gray-300">
            First milestone: get a reliable live webcam feed in the browser before adding
            MediaPipe pose landmarks and punch stats.
          </p>
        </header>
        <LiveCamera />
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
        <Route path="/session" element={<SessionSummaryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
