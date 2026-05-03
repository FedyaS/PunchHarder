import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AddUserModal,
  FirstVisitPopup,
  LeaderboardView,
  UserControls,
} from './components/Leaderboard.jsx'
import { PixelWordmark } from './components/PixelWordmark.jsx'
import {
  createUser,
  hasSeenWelcome,
  loadActiveUserId,
  loadLeaderboard,
  loadUsers,
  markWelcomeSeen,
  saveActiveUserId,
  saveLeaderboard,
  saveUsers,
} from './lib/leaderboardStorage.js'
import LiveAnalysisPage from './pages/LiveAnalysisPage.jsx'

export default function App() {
  const [users, setUsers] = useState(() => loadUsers())
  const [activeUserId, setActiveUserId] = useState(() => {
    const savedUsers = loadUsers()
    const savedActiveUserId = loadActiveUserId()
    if (savedUsers.some((user) => user.id === savedActiveUserId)) return savedActiveUserId
    return savedUsers.length === 1 ? savedUsers[0].id : ''
  })
  const [leaderboard, setLeaderboard] = useState(() => loadLeaderboard())
  const [showWelcome, setShowWelcome] = useState(() => !hasSeenWelcome())
  const [showAddUser, setShowAddUser] = useState(false)

  const activeUser = useMemo(
    () => users.find((user) => user.id === activeUserId) || null,
    [activeUserId, users],
  )

  useEffect(() => {
    saveUsers(users)
  }, [users])

  useEffect(() => {
    saveActiveUserId(activeUserId)
  }, [activeUserId])

  useEffect(() => {
    saveLeaderboard(leaderboard)
  }, [leaderboard])

  const closeWelcome = useCallback(() => {
    markWelcomeSeen()
    setShowWelcome(false)
  }, [])

  const openAddUser = useCallback(() => {
    markWelcomeSeen()
    setShowWelcome(false)
    setShowAddUser(true)
  }, [])

  const addUser = useCallback((name) => {
    const user = createUser(name)
    setUsers((current) => [...current, user])
    setActiveUserId(user.id)
    setShowAddUser(false)
  }, [])

  const saveRoundToLeaderboard = useCallback((sessionResults) => {
    if (!activeUser) return

    const score = Number(sessionResults?.score?.score)
    if (!Number.isFinite(score)) return

    const punchCount = (sessionResults?.clips || []).reduce((total, clip) => {
      if (clip?.error) return total
      return total + (clip?.classified_labels?.punches?.length || 0)
    }, 0)

    const completedAt = new Date().toISOString()
    const nextRow = {
      userId: activeUser.id,
      name: activeUser.name,
      score: Math.round(score),
      punchCount,
      level: sessionResults?.score?.level || '',
      summary: sessionResults?.score?.summary || '',
      sessionId: sessionResults?.session_id || '',
      completedAt,
    }

    setLeaderboard((current) => (
      [nextRow, ...current.filter((row) => row.userId !== activeUser.id)]
        .sort((a, b) => b.score - a.score || new Date(b.completedAt) - new Date(a.completedAt))
    ))
  }, [activeUser])

  const scrollToTraining = useCallback(() => {
    document.getElementById('training-camera')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const scrollToLeaderboard = useCallback(() => {
    document.getElementById('leaderboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <main className="min-h-screen bg-background text-on-background font-body-md selection:bg-primary-container selection:text-on-primary-container">
      {showWelcome && (
        <FirstVisitPopup
          onClose={closeWelcome}
          onAddUser={openAddUser}
        />
      )}

      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onSubmit={addUser}
        />
      )}

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

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-lg bg-primary px-5 py-3 font-label-bold text-xs uppercase tracking-widest text-on-primary transition-all active:scale-95"
                  onClick={scrollToTraining}
                >
                  Training
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-surface-container-highest bg-surface-container-high/60 px-5 py-3 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant transition-all hover:text-primary active:scale-95"
                  onClick={scrollToLeaderboard}
                >
                  Leaderboard
                </button>
              </div>
            </div>

            <div className="relative hidden h-32 items-end justify-end gap-4 lg:flex">
              <div className="pointer-events-none flex h-full items-end justify-end gap-4" aria-hidden="true">
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
              {activeUser && (
                <div className="absolute right-0 top-0 rounded-lg border border-primary/30 bg-primary-container/30 px-4 py-2 text-right">
                  <p className="font-label-bold text-[10px] uppercase tracking-widest text-primary">Active User</p>
                  <p className="font-headline-md text-sm font-black uppercase text-on-surface">{activeUser.name}</p>
                </div>
              )}
            </div>
          </div>
        </header>

        <UserControls
          users={users}
          activeUserId={activeUserId}
          onActiveUserChange={setActiveUserId}
          onAddUser={openAddUser}
        />

        <LiveAnalysisPage
          embedded
          currentUser={activeUser}
          onRoundCompleted={saveRoundToLeaderboard}
          onAddUser={openAddUser}
          onViewLeaderboard={scrollToLeaderboard}
          belowCamera={(
            <LeaderboardView
              rows={leaderboard}
              users={users}
              onAddUser={openAddUser}
              onTrain={scrollToTraining}
            />
          )}
        />
      </div>
    </main>
  )
}
