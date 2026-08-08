const DURATION = 20
const MAX_HEALTH = 100
const MAX_CHARGE = 100
const MAX_MODE_DURATION = 7

export function createGameState() {
  return {
    duration: DURATION,
    timeRemaining: DURATION,
    score: 0,
    destroyedTrucks: 0,
    maxCharge: 0,
    maxModeRemaining: 0,
    animalKillsTowardEnemyMax: 0,
    health: MAX_HEALTH,
    isOver: false,
    endReason: null,
  }
}

export function updateGameState(state, delta) {
  if (state.isOver) return
  if (state.maxModeRemaining > 0) {
    state.maxModeRemaining = Math.max(0, state.maxModeRemaining - delta)
  } else {
    state.timeRemaining = Math.max(0, state.timeRemaining - delta)
  }
  if (state.timeRemaining === 0) {
    state.isOver = true
    state.endReason = 'time'
  }
}

export function damagePlayer(state, amount) {
  if (state.isOver) return
  const finalDamage = state.maxModeRemaining > 0 ? Math.max(1, Math.ceil(amount * 0.35)) : amount
  state.health = Math.max(0, state.health - finalDamage)
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
  state.score += state.maxModeRemaining > 0 ? points * 2 : points
}

export function addMaxCharge(state, amount) {
  if (state.isOver || state.maxModeRemaining > 0) return false
  state.maxCharge = Math.min(MAX_CHARGE, state.maxCharge + amount)
  if (state.maxCharge < MAX_CHARGE) return false
  state.maxCharge = 0
  state.maxModeRemaining = MAX_MODE_DURATION
  return true
}

export function isMaxMode(state) {
  return state.maxModeRemaining > 0
}

export function recordDestroyedTruck(state) {
  if (state.isOver) return
  state.destroyedTrucks += 1
}

export function recordAnimalKill(state) {
  if (state.isOver) return false
  state.animalKillsTowardEnemyMax += 1
  if (state.animalKillsTowardEnemyMax < 3) return false
  state.animalKillsTowardEnemyMax = 0
  return true
}

export function addTime(state, seconds) {
  if (state.isOver) return 0
  state.timeRemaining += seconds
  return seconds
}

export function resetGameState(state) {
  state.timeRemaining = state.duration
  state.score = 0
  state.destroyedTrucks = 0
  state.maxCharge = 0
  state.maxModeRemaining = 0
  state.animalKillsTowardEnemyMax = 0
  state.health = MAX_HEALTH
  state.isOver = false
  state.endReason = null
}
