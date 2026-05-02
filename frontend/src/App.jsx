import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { LiveCamera } from './components/LiveCamera'
import Analysis from './pages/Analysis'
import Replay from './pages/Replay'
import Label from './pages/Label'

function Nav() {
  const base = "px-4 py-2 text-sm font-medium rounded-lg transition-colors"
  const active = `${base} bg-emerald-500 text-black`
  const inactive = `${base} text-gray-400 hover:text-white hover:bg-gray-800`

  return (
    <nav className="bg-gray-950 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-2">
        <span className="text-emerald-400 font-black text-lg tracking-tight mr-6">PunchHarder</span>
        <NavLink to="/" end className={({ isActive }) => isActive ? active : inactive}>Home</NavLink>
        <NavLink to="/replay" className={({ isActive }) => isActive ? active : inactive}>Replay</NavLink>
        <NavLink to="/analysis" className={({ isActive }) => isActive ? active : inactive}>Analysis</NavLink>
        <NavLink to="/label" className={({ isActive }) => isActive ? active : inactive}>Label</NavLink>
      </div>
    </nav>
  )
}

function Home() {
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
        <Route path="/" element={<Home />} />
        <Route path="/replay" element={<Replay />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/label" element={<Label />} />
      </Routes>
    </BrowserRouter>
  )
}
