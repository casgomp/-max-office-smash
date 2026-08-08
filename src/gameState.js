const DURATION = 20
const MAX_HEALTH = 100

export function createGameState() {
  return {
    duration: DURATION,
    timeRemaining: DURATION,
    score: 0,
    health: MAX_HEALTH,
    isOver: false,
    endReason: null,
  }
}

export function updateGameState(state, delta) {
  if (state.isOver) return
  state.timeRemaining = Math.max(0, state.timeRemaining - delta)
  if (state.timeRemaining === 0) {
    state.isOver = true
    state.endReason = 'time'
  }
}

export function damagePlayer(state, amount) {
  if (state.isOver) return
  state.health = Math.max(0, state.health - amount)
  if (state.health === 0) {
    state.isOver = true
    state.endReason = 'destroyed'
  }
}

export function healPlayer(state, amount) {
  if (state.isOver || state.health >= MAX_HEALTH) return 0
  const previousHealth = state.health
  state.health = Math.min(MAX_HEALTH, state.health + amount)
  return state.health - previousHealth
}

export function addScore(state, points) {
  if (state.isOver) return
  state.score += points
}

export function resetGameState(state) {
  state.timeRemaining = state.duration
  state.score = 0
  state.health = MAX_HEALTH
  state.isOver = false
  state.endReason = null
}
