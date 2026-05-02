import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import MarketingHomePage from './pages/MarketingHomePage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LiveAnalysisPage from './pages/LiveAnalysisPage.jsx'
import SessionSummaryPage from './pages/SessionSummaryPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MarketingHomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/live" element={<LiveAnalysisPage />} />
        <Route path="/session" element={<SessionSummaryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
