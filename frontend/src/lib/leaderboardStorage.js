const STORAGE_KEYS = {
  users: 'punchharder_users',
  activeUserId: 'punchharder_active_user_id',
  leaderboard: 'punchharder_leaderboard',
  welcomeSeen: 'punchharder_welcome_seen',
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Local storage can fail in private browsing; the in-memory React state still works.
  }
}

export function loadUsers() {
  const users = readJson(STORAGE_KEYS.users, [])
  return Array.isArray(users) ? users : []
}

export function saveUsers(users) {
  writeJson(STORAGE_KEYS.users, users)
}

export function loadActiveUserId() {
  try {
    return localStorage.getItem(STORAGE_KEYS.activeUserId) || ''
  } catch {
    return ''
  }
}

export function saveActiveUserId(userId) {
  try {
    if (userId) {
      localStorage.setItem(STORAGE_KEYS.activeUserId, userId)
    } else {
      localStorage.removeItem(STORAGE_KEYS.activeUserId)
    }
  } catch {
    // noop
  }
}

export function loadLeaderboard() {
  const rows = readJson(STORAGE_KEYS.leaderboard, [])
  return Array.isArray(rows) ? rows : []
}

export function saveLeaderboard(rows) {
  writeJson(STORAGE_KEYS.leaderboard, rows)
}

export function hasSeenWelcome() {
  try {
    return localStorage.getItem(STORAGE_KEYS.welcomeSeen) === '1'
  } catch {
    return false
  }
}

export function markWelcomeSeen() {
  try {
    localStorage.setItem(STORAGE_KEYS.welcomeSeen, '1')
  } catch {
    // noop
  }
}

export function createUser(name) {
  return {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  }
}
