import * as THREE from 'three'
import './style.css'
import { createScene } from './scene.js'
import { createTruck, updateTruck, resetTruck } from './truck.js'
import { createInput } from './input.js'
import { createOfficeObjects, clearOfficeObjects } from './office.js'
import { createCollisionSystem } from './collision.js'
import { createGameState, updateGameState, addScore, resetGameState } from './gameState.js'
import { createUI } from './ui.js'
import { recordRun, clearRuns } from './leaderboard.js'

window.addEventListener('beforeunload', clearRuns)

const { scene, camera, renderer } = createScene()
const truck = createTruck(scene)
const input = createInput()
const collisionSystem = createCollisionSystem(scene)
const gameState = createGameState()

let officeObjects = createOfficeObjects(scene)
let gameOverShown = false
let started = false
let playerName = 'Player'

const ui = createUI({ onStart: startGame, onPlayAgain: returnToStart })

const CAMERA_OFFSET = new THREE.Vector3(0, 27, -18)
const CAMERA_LOOK_OFFSET = new THREE.Vector3(0, 1, 0)
const CAMERA_LERP = 4

const cameraTarget = new THREE.Vector3()
const lookTarget = new THREE.Vector3()

snapCamera()
ui.showStart()

let previousTime = performance.now()

function animate() {
  requestAnimationFrame(animate)

  const now = performance.now()
  const delta = Math.min((now - previousTime) / 1000, 0.1)
  previousTime = now

  if (started && !gameState.isOver) {
    updateGameState(gameState, delta)
    updateTruck(truck, input, delta)
    collisionSystem.checkCollisions(truck, officeObjects, (points) => addScore(gameState, points))
  }
  collisionSystem.updateFlyingObjects(delta)
  updateCamera(delta)

  ui.updateHUD(gameState.score, gameState.timeRemaining)

  if (started && gameState.isOver && !gameOverShown) {
    gameOverShown = true
    const { rank, total, leaderboard, run } = recordRun(playerName, gameState.score)
    ui.showGameOver(gameState.score, rank, total, leaderboard, run)
  }

  renderer.render(scene, camera)
}

function startGame(name) {
  playerName = name
  resetGameState(gameState)
  resetTruck(truck)
  clearOfficeObjects(scene, officeObjects)
  officeObjects = createOfficeObjects(scene)
  collisionSystem.reset()
  gameOverShown = false
  started = true
  ui.hideStart()
  ui.hideGameOver()
  ui.updateHUD(gameState.score, gameState.timeRemaining)
  snapCamera()
}

function returnToStart() {
  started = false
  ui.hideGameOver()
  ui.showStart()
}

function updateCamera(delta) {
  cameraTarget
    .copy(CAMERA_OFFSET)
    .applyEuler(new THREE.Euler(0, truck.heading, 0))
    .add(truck.mesh.position)

  const lerpFactor = 1 - Math.exp(-CAMERA_LERP * delta)
  camera.position.lerp(cameraTarget, lerpFactor)

  lookTarget.copy(truck.mesh.position).add(CAMERA_LOOK_OFFSET)
  camera.lookAt(lookTarget)
}

function snapCamera() {
  cameraTarget
    .copy(CAMERA_OFFSET)
    .applyEuler(new THREE.Euler(0, truck.heading, 0))
    .add(truck.mesh.position)
  camera.position.copy(cameraTarget)

  lookTarget.copy(truck.mesh.position).add(CAMERA_LOOK_OFFSET)
  camera.lookAt(lookTarget)
}

animate()
