const DURATION = 10

export function createGameState() {
  return {
    duration: DURATION,
    timeRemaining: DURATION,
    score: 0,
    isOver: false,
  }
}

export function updateGameState(state, delta) {
  if (state.isOver) return
  state.timeRemaining = Math.max(0, state.timeRemaining - delta)
  if (state.timeRemaining === 0) {
    state.isOver = truewa
  }
}

export function addScore(state, points) {
  if (state.isOver) return
  state.score += points
}

export function resetGameState(state) {
  state.timeRemaining = state.duration
  state.score = 0
  state.isOver = false
}
