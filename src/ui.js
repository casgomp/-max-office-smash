export function createUI({ onStart, onPlayAgain, onSoundChange, onTruckColorChange, onDurationChange, onDifficultyChange, onEnemyCountChange, farmSize }) {
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
      <div id="main-menu" class="menu-view">
        <button id="play-button" type="button">Play Game</button>
        <button id="instructions-button" type="button">How to Play</button>
        <button id="options-button" type="button">Options</button>
        <button id="quit-button" type="button">Quit</button>
      </div>
      <div id="instructions-menu" class="menu-view instructions-view hidden">
        <h2>How to Play</h2>
        <div class="instruction-section">
          <h3>Controls</h3>
          <p><strong>WASD / Arrow keys</strong> — Drive</p>
          <p><strong>Space bar</strong> — Shoot</p>
        </div>
        <div class="instruction-section">
          <h3>Goal and points</h3>
          <p>Survive until the timer ends and finish with the highest score.</p>
          <p>Destroy an NPC enemy truck: <strong>+200 points and +3 seconds</strong>.</p>
          <p>Crashing into animals gives <strong>no points</strong> and costs 10 health.</p>
        </div>
        <div class="instruction-section">
          <h3>Health and combat</h3>
          <p>Vegetables restore <strong>25 health</strong>. Your maximum health is 100.</p>
          <p>Player bullets deal 15 damage and player crashes deal 12 damage.</p>
          <p>Your truck disappears when destroyed. Start another round to respawn.</p>
        </div>
        <div class="instruction-section">
          <h3>MAX mode</h3>
          <p>Fill the MAX meter by fighting, collecting vegetables, and smashing obstacles.</p>
          <p>MAX mode lasts 7 seconds, doubles points, strengthens shots, and reduces damage.</p>
          <p>Crash into 3 animals and NPC enemies enter MAX mode for 3 seconds.</p>
        </div>
        <button class="back-button secondary" type="button">Back</button>
      </div>
      <div id="player-setup" class="menu-view hidden">
        <p class="controls">Drive: WASD or arrow keys<br />Shoot: Space bar</p>
        <input id="player-name" type="text" placeholder="Enter your name" maxlength="16" />
        <button id="start-button" type="button">Start Game</button>
        <button class="back-button secondary" type="button">Back</button>
      </div>
      <div id="options-menu" class="menu-view hidden">
        <label><input id="sound-option" type="checkbox" checked /> Sound effects</label>
        <label><input id="minimap-option" type="checkbox" checked /> Show minimap</label>
        <label>Truck color
          <select id="truck-color-option">
            <option value="red">Red</option><option value="blue">Blue</option>
            <option value="green">Green</option><option value="orange">Orange</option>
            <option value="purple">Purple</option>
          </select>
        </label>
        <label>Game time
          <select id="duration-option">
            <option value="20">20 seconds</option><option value="30">30 seconds</option>
            <option value="40">40 seconds</option>
          </select>
        </label>
        <label>Difficulty
          <select id="difficulty-option">
            <option value="easy">Easy</option><option value="medium" selected>Medium</option>
            <option value="hard">Hard</option><option value="expert">Expert</option>
          </select>
        </label>
        <label>Enemy trucks
          <select id="enemy-count-option">
            <option value="0">0 (players only)</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>
            <option value="4">4</option><option value="5" selected>5</option>
            <option value="6">6</option><option value="7">7</option>
          </select>
        </label>
        <p class="controls">WASD / Arrows — Drive<br />Space — Shoot</p>
        <button class="back-button secondary" type="button">Back</button>
      </div>
      <div id="quit-menu" class="menu-view hidden">
        <p>Thanks for playing Max Farm Smash!</p>
        <button class="back-button" type="button">Return to Menu</button>
      </div>
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
      <div id="leaderboard-header"><span>Player</span><span>Score</span><span>Enemy</span></div>
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
  const mainMenu = start.querySelector('#main-menu')
  const playerSetup = start.querySelector('#player-setup')
  const instructionsMenu = start.querySelector('#instructions-menu')
  const optionsMenu = start.querySelector('#options-menu')
  const quitMenu = start.querySelector('#quit-menu')
  const startButton = start.querySelector('#start-button')
  const minimapOption = start.querySelector('#minimap-option')
  let minimapEnabled = true
  const finalScoreEl = gameOver.querySelector('#final-score')
  const finalRankEl = gameOver.querySelector('#final-rank')
  const finalDestroyedEl = gameOver.querySelector('#final-destroyed')
  const leaderboardListEl = gameOver.querySelector('#leaderboard-list')

  startButton.addEventListener('click', () => {
    onStart(nameInput.value.trim() || 'Player')
  })
  start.querySelector('#play-button').addEventListener('click', () => {
    showMenuView(playerSetup)
    nameInput.focus()
  })
  start.querySelector('#instructions-button').addEventListener('click', () => showMenuView(instructionsMenu))
  start.querySelector('#options-button').addEventListener('click', () => showMenuView(optionsMenu))
  start.querySelector('#quit-button').addEventListener('click', () => showMenuView(quitMenu))
  for (const button of start.querySelectorAll('.back-button')) {
    button.addEventListener('click', () => showMenuView(mainMenu))
  }
  start.querySelector('#sound-option').addEventListener('change', (event) => onSoundChange(event.target.checked))
  minimapOption.addEventListener('change', () => { minimapEnabled = minimapOption.checked })
  start.querySelector('#truck-color-option').addEventListener('change', (event) => onTruckColorChange(event.target.value))
  start.querySelector('#duration-option').addEventListener('change', (event) => onDurationChange(Number(event.target.value)))
  start.querySelector('#difficulty-option').addEventListener('change', (event) => onDifficultyChange(event.target.value))
  start.querySelector('#enemy-count-option').addEventListener('change', (event) => onEnemyCountChange(Number(event.target.value)))
  nameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') startButton.click()
  })

  gameOver.querySelector('#play-again-button').addEventListener('click', onPlayAgain)

  return {
    showStart() {
      showMenuView(mainMenu)
      document.body.classList.remove('max-mode')
      start.classList.remove('hidden')
      hud.classList.add('hidden')
      minimap.classList.add('hidden')
    },
    hideStart() {
      start.classList.add('hidden')
      hud.classList.remove('hidden')
      minimap.classList.toggle('hidden', !minimapEnabled)
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

      renderLeaderboard(leaderboardListEl, leaderboard, currentRun)

      gameOver.classList.remove('hidden')
    },
    updateLeaderboard(rank, total, leaderboard, currentRun) {
      finalRankEl.textContent = `Rank: ${rank} of ${total}`
      renderLeaderboard(leaderboardListEl, leaderboard, currentRun)
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
    updateMinimap(player, heading, enemies, animals, vegetables, multiplayerTrucks = []) {
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
      drawMapDots(minimapContext, multiplayerTrucks, mapX, mapY, '#ffd84d', 3.5)

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

function showMenuView(activeView) {
  for (const view of activeView.parentElement.querySelectorAll('.menu-view')) {
    view.classList.toggle('hidden', view !== activeView)
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

function renderLeaderboard(element, leaderboard, currentRun) {
  element.innerHTML = leaderboard
    .map((run) => {
      const isCurrent = run === currentRun || (run.id && run.id === currentRun?.id)
      const current = isCurrent ? ' class="current"' : ''
      return `<li${current}><span>${escapeHtml(run.name)}</span><span>${run.score}</span><span>${run.destroyedTrucks ?? 0}</span></li>`
    })
    .join('')
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
