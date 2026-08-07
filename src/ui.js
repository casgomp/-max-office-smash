export function createUI({ onStart, onPlayAgain }) {
  const hud = document.createElement('div')
  hud.id = 'hud'
  hud.classList.add('hidden')
  hud.innerHTML = `
    <div id="score">Score: 0</div>
    <div id="timer">Time: 60</div>
  `

  const start = document.createElement('div')
  start.id = 'start-screen'
  start.innerHTML = `
    <div class="panel">
      <h1>Max Office Smash</h1>
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

  const scoreEl = hud.querySelector('#score')
  const timerEl = hud.querySelector('#timer')
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
    updateHUD(score, timeRemaining) {
      scoreEl.textContent = `Score: ${score}`
      timerEl.textContent = `Time: ${Math.ceil(timeRemaining)}`
    },
    showGameOver(finalScore, rank, total, leaderboard, currentRun) {
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
  }
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
