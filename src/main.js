import * as THREE from 'three'
import './style.css'
import { createScene } from './scene.js'
import { createTruck, updateTruck, resetTruck, updateTruckHealth, applyTruckImpact } from './truck.js'
import { createInput } from './input.js'
import { createFarmObjects, clearFarmObjects, respawnFarmAnimal } from './farm.js'
import { createCollisionSystem } from './collision.js'
import { createGameState, updateGameState, addScore, damagePlayer, healPlayer, resetGameState } from './gameState.js'
import { createUI } from './ui.js'
import { recordRun, clearRuns } from './leaderboard.js'
import { createEnemySystem } from './enemies.js'
import { createVegetableSystem } from './vegetables.js'

window.addEventListener('beforeunload', clearRuns)

const { scene, camera, renderer, projectileBlockers } = createScene()
const truck = createTruck(scene)
const input = createInput()
const collisionSystem = createCollisionSystem(scene)
const gameState = createGameState()
const enemySystem = createEnemySystem(scene, projectileBlockers)
const vegetableSystem = createVegetableSystem(scene)

let farmObjects = createFarmObjects(scene)
let gameOverShown = false
let started = false
let playerName = 'Player'

const ui = createUI({ onStart: startGame, onPlayAgain: returnToStart })

const CAMERA_OFFSET = new THREE.Vector3(0, 27, -18)
const CAMERA_LOOK_OFFSET = new THREE.Vector3(0, 1, 0)
const CAMERA_LERP = 4

const cameraTarget = new THREE.Vector3()
const lookTarget = new THREE.Vector3()
const cameraShakeOffset = new THREE.Vector3()
let cameraShake = 0

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
    collisionSystem.checkCollisions(truck, farmObjects, (points, animal) => {
      addScore(gameState, points)
      takeDamage(10)
      respawnFarmAnimal(scene, farmObjects, animal)
    })
    enemySystem.update(
      delta,
      truck,
      (direction) => {
        takeDamage(5)
        applyTruckImpact(truck, direction, 4)
      },
      (amount, direction) => {
        takeDamage(amount)
        applyTruckImpact(truck, direction, 10)
      },
      (points) => addScore(gameState, points),
      input.shoot,
    )
    vegetableSystem.update(truck, (amount, type) => {
      const healed = healPlayer(gameState, amount)
      ui.showPickup(type, healed)
      return healed > 0
    })
  }
  collisionSystem.updateFlyingObjects(delta)
  updateCamera(delta)

  ui.updateHUD(gameState.score, gameState.timeRemaining, gameState.health)
  updateTruckHealth(truck, gameState.health)

  if (started && gameState.isOver && !gameOverShown) {
    gameOverShown = true
    const { rank, total, leaderboard, run } = recordRun(playerName, gameState.score)
    enemySystem.clearProjectiles()
    ui.showGameOver(gameState.score, rank, total, leaderboard, run, gameState.endReason)
  }

  renderer.render(scene, camera)
}

function startGame(name) {
  playerName = name
  resetGameState(gameState)
  resetTruck(truck)
  clearFarmObjects(scene, farmObjects)
  farmObjects = createFarmObjects(scene)
  collisionSystem.reset()
  enemySystem.spawn()
  vegetableSystem.spawn()
  gameOverShown = false
  started = true
  cameraShake = 0
  ui.hideStart()
  ui.hideGameOver()
  ui.updateHUD(gameState.score, gameState.timeRemaining, gameState.health)
  updateTruckHealth(truck, gameState.health)
  snapCamera()
}

function returnToStart() {
  started = false
  enemySystem.clear()
  vegetableSystem.clear()
  ui.hideGameOver()
  ui.showStart()
}

function takeDamage(amount) {
  const previousHealth = gameState.health
  damagePlayer(gameState, amount)
  const damageTaken = previousHealth - gameState.health
  if (damageTaken <= 0) return
  cameraShake = Math.max(cameraShake, Math.min(1.2, damageTaken / 25))
  ui.showDamage(damageTaken)
}

function updateCamera(delta) {
  cameraTarget
    .copy(CAMERA_OFFSET)
    .applyEuler(new THREE.Euler(0, truck.heading, 0))
    .add(truck.mesh.position)

  const lerpFactor = 1 - Math.exp(-CAMERA_LERP * delta)
  camera.position.lerp(cameraTarget, lerpFactor)

  if (cameraShake > 0.01) {
    cameraShakeOffset.set(
      THREE.MathUtils.randFloatSpread(cameraShake),
      THREE.MathUtils.randFloatSpread(cameraShake * 0.7),
      THREE.MathUtils.randFloatSpread(cameraShake),
    )
    camera.position.add(cameraShakeOffset)
    cameraShake *= Math.exp(-9 * delta)
  } else {
    cameraShake = 0
  }

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
