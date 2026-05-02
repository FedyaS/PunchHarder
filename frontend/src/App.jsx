import { useState, useRef, useEffect } from 'react'
import { BrowserRouter, Navigate, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { LiveCamera } from './components/LiveCamera'
import Analysis from './pages/Analysis'
import Replay from './pages/Replay'
import Label from './pages/Label'
import MarketingHomePage from './pages/MarketingHomePage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LiveAnalysisPage from './pages/LiveAnalysisPage.jsx'
import SessionSummaryPage from './pages/SessionSummaryPage.jsx'

function DevDropdown({ base, active, inactive }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()
  const devPaths = ['/replay', '/analysis', '/label']
  const isDevActive = devPaths.includes(location.pathname)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={isDevActive ? active : inactive}
      >
        Dev {open ? '\u25B4' : '\u25BE'}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[140px] z-50">
          <NavLink to="/replay" onClick={() => setOpen(false)} className={({ isActive }) => `block px-4 py-2 text-sm ${isActive ? 'text-emerald-400 bg-gray-800' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>Replay</NavLink>
          <NavLink to="/analysis" onClick={() => setOpen(false)} className={({ isActive }) => `block px-4 py-2 text-sm ${isActive ? 'text-emerald-400 bg-gray-800' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>Analysis</NavLink>
          <NavLink to="/label" onClick={() => setOpen(false)} className={({ isActive }) => `block px-4 py-2 text-sm ${isActive ? 'text-emerald-400 bg-gray-800' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>Label</NavLink>
        </div>
      )}
    </div>
  )
}

function Nav() {
  const base = "px-4 py-2 text-sm font-medium rounded-lg transition-colors"
  const active = `${base} bg-emerald-500 text-black`
  const inactive = `${base} text-gray-400 hover:text-white hover:bg-gray-800`

  return (
    <nav className="bg-gray-950 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-2">
        <span className="text-emerald-400 font-black text-lg tracking-tight mr-6">PunchHarder</span>
        <NavLink to="/" end className={({ isActive }) => isActive ? active : inactive}>Home</NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? active : inactive}>Dashboard</NavLink>
        <NavLink to="/live" className={({ isActive }) => isActive ? active : inactive}>Live</NavLink>
        <NavLink to="/session" className={({ isActive }) => isActive ? active : inactive}>Session</NavLink>
        <DevDropdown base={base} active={active} inactive={inactive} />
      </div>
    </nav>
  )
}

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
      <Nav />
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
