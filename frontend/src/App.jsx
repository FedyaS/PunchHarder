import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Analysis from './pages/Analysis'

function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <h1 className="text-5xl font-black text-white mb-2">PunchHarder</h1>
        <p className="text-gray-400 mb-8">AI-powered shadowboxing coach</p>
        <Link
          to="/analysis"
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg transition-colors"
        >
          View Analysis
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/analysis" element={<Analysis />} />
      </Routes>
    </BrowserRouter>
  )
}
