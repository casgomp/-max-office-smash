export function createUI({ onStart, onPlayAgain }) {
  const hud = document.createElement('div')
  hud.id = 'hud'
  hud.classList.add('hidden')
  hud.innerHTML = `
    <div id="score">Score: 0</div>
    <div id="timer">Time: 20</div>
    <div id="health">Health: 100</div>
  `

  const start = document.createElement('div')
  start.id = 'start-screen'
  start.innerHTML = `
    <div class="panel">
      <h1>Max Farm Smash</h1>
      <p class="controls">Drive: WASD or arrow keys<br />Shoot: Space bar</p>
      <input id="player-name" type="text" placeholder="Enter your name" maxlength="16" />
      <button id="start-button" type="button">Start</button>
    </div>
  `

  const gameOver = document.createElement('div')
  gameOver.id = 'game-over'
  gameOver.classList.add('hidden')
  gameOver.innerHTML = `
    <div class="panel">
      <h1>Time's Up!</h1>
      <p id="final-score">Final Score: 0</p>
      <p id="final-rank">Rank: -</p>
      <ol id="leaderboard-list"></ol>
      <button id="play-again-button" type="button">Play Again</button>
    </div>
  `

  document.querySelector('#app').append(hud, start, gameOver)

  const pickupMessage = document.createElement('div')
  pickupMessage.id = 'pickup-message'
  pickupMessage.classList.add('hidden')
  document.querySelector('#app').append(pickupMessage)
  let pickupTimeout

  const damageEffect = document.createElement('div')
  damageEffect.id = 'damage-effect'
  damageEffect.classList.add('hidden')
  damageEffect.innerHTML = '<span></span>'
  document.querySelector('#app').append(damageEffect)

  const scoreEl = hud.querySelector('#score')
  const timerEl = hud.querySelector('#timer')
  const healthEl = hud.querySelector('#health')
  const nameInput = start.querySelector('#player-name')
  const startButton = start.querySelector('#start-button')
  const finalScoreEl = gameOver.querySelector('#final-score')
  const finalRankEl = gameOver.querySelector('#final-rank')
  const leaderboardListEl = gameOver.querySelector('#leaderboard-list')

  startButton.addEventListener('click', () => {
    onStart(nameInput.value.trim() || 'Player')
  })
  nameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') startButton.click()
  })

  gameOver.querySelector('#play-again-button').addEventListener('click', onPlayAgain)

  return {
    showStart() {
      start.classList.remove('hidden')
      hud.classList.add('hidden')
      nameInput.focus()
    },
    hideStart() {
      start.classList.add('hidden')
      hud.classList.remove('hidden')
    },
    updateHUD(score, timeRemaining, health) {
      scoreEl.textContent = `Score: ${score}`
      timerEl.textContent = `Time: ${Math.ceil(timeRemaining)}`
      healthEl.textContent = `Health: ${health}`
      healthEl.classList.toggle('danger', health <= 30)
    },
    showGameOver(finalScore, rank, total, leaderboard, currentRun, endReason) {
      gameOver.querySelector('h1').textContent = endReason === 'destroyed' ? 'Truck Destroyed!' : "Time's Up!"
      finalScoreEl.textContent = `Final Score: ${finalScore}`
      finalRankEl.textContent = `Rank: ${rank} of ${total} this session`

      leaderboardListEl.innerHTML = leaderboard
        .map((run) => {
          const current = run === currentRun ? ' class="current"' : ''
          return `<li${current}><span>${escapeHtml(run.name)}</span><span>${run.score}</span></li>`
        })
        .join('')

      gameOver.classList.remove('hidden')
    },
    hideGameOver() {
      gameOver.classList.add('hidden')
    },
    showPickup(type, healed) {
      if (healed <= 0) return
      pickupMessage.textContent = `${type[0].toUpperCase() + type.slice(1)} +${healed} health`
      pickupMessage.classList.remove('hidden')
      clearTimeout(pickupTimeout)
      pickupTimeout = setTimeout(() => pickupMessage.classList.add('hidden'), 1100)
    },
    showDamage(amount) {
      damageEffect.querySelector('span').textContent = `-${amount}`
      damageEffect.classList.remove('hidden', 'hit')
      void damageEffect.offsetWidth
      damageEffect.classList.add('hit')
    },
  }
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
