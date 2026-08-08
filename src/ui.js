export function createUI({ onStart, onPlayAgain, farmSize }) {
  const hud = document.createElement('div')
  hud.id = 'hud'
  hud.classList.add('hidden')
  hud.innerHTML = `
    <div id="score">Score: 0</div>
    <div id="timer">Time: 20</div>
    <div id="health">Health: 100</div>
    <div id="destroyed-trucks">Trucks destroyed: 0</div>
    <div id="max-meter"><span>MAX</span><div class="max-track"><i></i></div></div>
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
      <p id="final-destroyed">Trucks Destroyed: 0</p>
      <ol id="leaderboard-list"></ol>
      <button id="play-again-button" type="button">Play Again</button>
    </div>
  `

  document.querySelector('#app').append(hud, start, gameOver)

  const minimap = document.createElement('canvas')
  minimap.id = 'minimap'
  minimap.classList.add('hidden')
  minimap.width = 190
  minimap.height = 190
  document.querySelector('#app').append(minimap)
  const minimapContext = minimap.getContext('2d')

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
  const destroyedTrucksEl = hud.querySelector('#destroyed-trucks')
  const maxMeterEl = hud.querySelector('#max-meter')
  const maxFillEl = maxMeterEl.querySelector('i')
  const nameInput = start.querySelector('#player-name')
  const startButton = start.querySelector('#start-button')
  const finalScoreEl = gameOver.querySelector('#final-score')
  const finalRankEl = gameOver.querySelector('#final-rank')
  const finalDestroyedEl = gameOver.querySelector('#final-destroyed')
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
      document.body.classList.remove('max-mode')
      start.classList.remove('hidden')
      hud.classList.add('hidden')
      minimap.classList.add('hidden')
      nameInput.focus()
    },
    hideStart() {
      start.classList.add('hidden')
      hud.classList.remove('hidden')
      minimap.classList.remove('hidden')
    },
    updateHUD(score, timeRemaining, health, destroyedTrucks, maxCharge, maxModeRemaining) {
      scoreEl.textContent = `Score: ${score}`
      timerEl.textContent = `Time: ${Math.ceil(timeRemaining)}`
      healthEl.textContent = `Health: ${health}`
      healthEl.classList.toggle('danger', health <= 30)
      destroyedTrucksEl.textContent = `Trucks destroyed: ${destroyedTrucks}`
      maxFillEl.style.width = `${maxModeRemaining > 0 ? 100 : maxCharge}%`
      maxMeterEl.classList.toggle('active', maxModeRemaining > 0)
      maxMeterEl.querySelector('span').textContent = maxModeRemaining > 0
        ? `MAX ${maxModeRemaining.toFixed(1)}s`
        : 'MAX'
      document.body.classList.toggle('max-mode', maxModeRemaining > 0)
    },
    showGameOver(finalScore, rank, total, leaderboard, currentRun, endReason, destroyedTrucks) {
      document.body.classList.remove('max-mode')
      minimap.classList.add('hidden')
      gameOver.querySelector('h1').textContent = endReason === 'destroyed' ? 'Truck Destroyed!' : "Time's Up!"
      finalScoreEl.textContent = `Final Score: ${finalScore}`
      finalRankEl.textContent = `Rank: ${rank} of ${total} this session`
      finalDestroyedEl.textContent = `Trucks Destroyed: ${destroyedTrucks}`

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
    showTimeBonus(seconds) {
      pickupMessage.textContent = `Enemy destroyed! +${seconds} seconds`
      pickupMessage.classList.remove('hidden')
      clearTimeout(pickupTimeout)
      pickupTimeout = setTimeout(() => pickupMessage.classList.add('hidden'), 1300)
    },
    showMaxMode() {
      pickupMessage.textContent = 'MAX MODE!'
      pickupMessage.classList.remove('hidden')
      clearTimeout(pickupTimeout)
      pickupTimeout = setTimeout(() => pickupMessage.classList.add('hidden'), 1600)
    },
    showEnemyMaxMode() {
      pickupMessage.textContent = 'ENEMY MAX MODE — 3 SECONDS!'
      pickupMessage.classList.remove('hidden')
      clearTimeout(pickupTimeout)
      pickupTimeout = setTimeout(() => pickupMessage.classList.add('hidden'), 1800)
    },
    showDamage(amount) {
      damageEffect.querySelector('span').textContent = `-${amount}`
      damageEffect.classList.remove('hidden', 'hit')
      void damageEffect.offsetWidth
      damageEffect.classList.add('hit')
    },
    updateMinimap(player, heading, enemies, animals, vegetables) {
      const size = minimap.width
      const padding = 10
      const mapSize = size - padding * 2
      const scale = mapSize / farmSize
      const mapX = (x) => size / 2 + x * scale
      const mapY = (z) => size / 2 + z * scale

      minimapContext.clearRect(0, 0, size, size)
      minimapContext.fillStyle = 'rgba(20, 37, 25, 0.88)'
      minimapContext.fillRect(0, 0, size, size)
      minimapContext.fillStyle = '#609c49'
      minimapContext.fillRect(padding, padding, mapSize, mapSize)
      minimapContext.strokeStyle = '#d4a866'
      minimapContext.lineWidth = 3
      minimapContext.strokeRect(padding, padding, mapSize, mapSize)

      drawMapDots(minimapContext, animals, mapX, mapY, '#f5efe2', 1.8)
      drawMapDots(minimapContext, vegetables, mapX, mapY, '#72ff62', 2.4)
      drawMapDots(minimapContext, enemies, mapX, mapY, '#ff4747', 3.2)

      minimapContext.save()
      minimapContext.translate(mapX(player.x), mapY(player.z))
      minimapContext.rotate(heading)
      minimapContext.fillStyle = '#53c7ff'
      minimapContext.beginPath()
      minimapContext.moveTo(0, 7)
      minimapContext.lineTo(-5, -5)
      minimapContext.lineTo(5, -5)
      minimapContext.closePath()
      minimapContext.fill()
      minimapContext.restore()
    },
  }
}

function drawMapDots(context, positions, mapX, mapY, color, radius) {
  context.fillStyle = color
  for (const position of positions) {
    context.beginPath()
    context.arc(mapX(position.x), mapY(position.z), radius, 0, Math.PI * 2)
    context.fill()
  }
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
