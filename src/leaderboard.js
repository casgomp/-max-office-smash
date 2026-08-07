const STORAGE_KEY = 'max-office-smash:runs'

export function loadRuns() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function recordRun(name, score) {
  const runs = loadRuns()
  const run = { name, score }
  runs.push(run)
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(runs))

  const rank = runs.filter((other) => other.score > score).length + 1
  const leaderboard = [...runs].sort((a, b) => b.score - a.score)

  return { rank, total: runs.length, leaderboard, run }
}

export function clearRuns() {
  sessionStorage.removeItem(STORAGE_KEY)
}
