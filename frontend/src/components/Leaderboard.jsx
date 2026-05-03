import { useState } from 'react'

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return '—'
  }
}

export function UserControls({ users, activeUserId, onActiveUserChange, onAddUser }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-surface-container-highest bg-surface-container-low/70 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-label-bold text-[10px] uppercase tracking-[0.25em] text-primary">Current Player</p>
        <p className="mt-1 text-sm text-on-surface-variant">
          Pick who is training so their next completed round updates the leaderboard.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          className="min-w-48 rounded-lg border border-surface-container-highest bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
          value={activeUserId}
          onChange={(event) => onActiveUserChange(event.target.value)}
        >
          <option value="">No player selected</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-lg bg-primary-container px-4 py-2 font-label-bold text-xs uppercase tracking-widest text-on-primary-container transition-all hover:bg-primary hover:text-on-primary active:scale-95"
          onClick={onAddUser}
        >
          Add User
        </button>
      </div>
    </div>
  )
}

export function FirstVisitPopup({ onClose, onAddUser }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-primary/30 bg-surface-container-low p-6 shadow-2xl shadow-black/40">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary">
            <span className="material-symbols-outlined text-3xl">emoji_events</span>
          </div>
          <div>
            <p className="font-label-bold text-xs uppercase tracking-[0.3em] text-primary">Welcome</p>
            <h2 className="mt-2 font-headline-md text-2xl font-black uppercase text-on-surface">
              Keep Your PunchHarder Score
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
              Register a player before or after a round. When that player completes a scored round, their leaderboard score is saved and their next round replaces the old score.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-lg border border-surface-container-highest px-5 py-3 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant transition-all hover:bg-surface-container-high active:scale-95"
            onClick={onClose}
          >
            Maybe Later
          </button>
          <button
            type="button"
            className="rounded-lg bg-primary px-5 py-3 font-label-bold text-xs uppercase tracking-widest text-on-primary transition-all hover:opacity-90 active:scale-95"
            onClick={onAddUser}
          >
            Add Player
          </button>
        </div>
      </div>
    </div>
  )
}

export function AddUserModal({ onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a player name.')
      return
    }
    onSubmit(trimmed)
    setName('')
    setError('')
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <form
        className="w-full max-w-md rounded-2xl border border-surface-container-highest bg-surface-container-low p-6 shadow-2xl shadow-black/40"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl text-primary">person_add</span>
          <div>
            <p className="font-label-bold text-xs uppercase tracking-[0.25em] text-primary">New User</p>
            <h2 className="font-headline-md text-2xl font-black uppercase text-on-surface">Add Player</h2>
          </div>
        </div>

        <label className="mt-6 block">
          <span className="font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">Player Name</span>
          <input
            className="mt-2 w-full rounded-lg border border-surface-container-highest bg-surface-container-high px-4 py-3 text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/60 focus:border-primary"
            autoFocus
            placeholder="Example: Anna"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError('')
            }}
          />
        </label>
        {error && <p className="mt-2 text-xs text-error">{error}</p>}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-lg border border-surface-container-highest px-5 py-3 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant transition-all hover:bg-surface-container-high active:scale-95"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-3 font-label-bold text-xs uppercase tracking-widest text-on-primary transition-all hover:opacity-90 active:scale-95"
          >
            Save User
          </button>
        </div>
      </form>
    </div>
  )
}

export function LeaderboardView({ rows, users, onAddUser, onTrain }) {
  return (
    <section id="leaderboard" className="grid scroll-mt-6 gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-surface-container-highest bg-surface-container-low/80 p-6 shadow-2xl shadow-black/20 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-label-bold text-xs uppercase tracking-[0.35em] text-primary">Leaderboard</p>
          <h2 className="mt-2 font-headline-md text-3xl font-black uppercase text-on-surface">Top PunchHarder Scores</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
            Registered players appear here after completing a scored round. A player's newest completed round replaces their previous score.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="rounded-lg border border-primary/30 bg-primary-container px-5 py-3 font-label-bold text-xs uppercase tracking-widest text-on-primary-container transition-all hover:bg-primary hover:text-on-primary active:scale-95"
            onClick={onAddUser}
          >
            Add User
          </button>
          <button
            type="button"
            className="rounded-lg border border-surface-container-highest px-5 py-3 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant transition-all hover:bg-surface-container-high active:scale-95"
            onClick={onTrain}
          >
            Back To Camera
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-low/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-container-highest bg-surface-container-high/40">
                <th className="px-5 py-4 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">Rank</th>
                <th className="px-5 py-4 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">User</th>
                <th className="px-5 py-4 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">Score</th>
                <th className="px-5 py-4 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">Punches</th>
                <th className="px-5 py-4 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">Level</th>
                <th className="px-5 py-4 font-label-bold text-xs uppercase tracking-widest text-on-surface-variant">Last Round</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row, index) => (
                  <tr key={row.userId} className="border-b border-surface-container-highest/50 transition-colors hover:bg-surface-container-high/20">
                    <td className="px-5 py-4 font-headline-md text-lg font-black tabular-nums text-primary">#{index + 1}</td>
                    <td className="px-5 py-4 font-label-bold text-sm uppercase tracking-wider text-on-surface">{row.name}</td>
                    <td className="px-5 py-4 font-headline-md text-2xl font-black tabular-nums text-on-surface">{row.score}</td>
                    <td className="px-5 py-4 font-headline-md text-xl font-black tabular-nums text-on-surface">{row.punchCount ?? '—'}</td>
                    <td className="px-5 py-4 text-sm capitalize text-on-surface-variant">{row.level?.replace(/_/g, ' ') || '—'}</td>
                    <td className="px-5 py-4 font-mono text-sm tabular-nums text-on-surface-variant">{formatDate(row.completedAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant">scoreboard</span>
                      <p className="font-label-bold text-sm uppercase tracking-widest text-on-surface">No scores yet</p>
                      <p className="max-w-md text-sm text-on-surface-variant">
                        {users.length
                          ? 'Start a round with a selected player to save their first leaderboard score.'
                          : 'Add a user, complete a round, and their score will show up here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
