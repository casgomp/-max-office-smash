import * as THREE from 'three'
import { io } from 'socket.io-client'
import './style.css'
import { createScene, ROOM_SIZE } from './scene.js'
import { createTruck, updateTruck, resetTruck, updateTruckHealth, applyTruckImpact, setTruckColor } from './truck.js'
import { createInput } from './input.js'
import { createFarmObjects, clearFarmObjects } from './farm.js'
import { createFarmTrees, clearFarmTrees } from './farmTrees.js'
import { createCollisionSystem } from './collision.js'
import { createGameState, updateGameState, addScore, addTime, addMaxCharge, damagePlayer, healPlayer, isMaxMode, recordAnimalKill, recordDestroyedTruck, resetGameState, setGameDuration } from './gameState.js'
import { createUI } from './ui.js'
import { recordRun, clearRuns } from './leaderboard.js'
import { createEnemySystem } from './enemies.js'
import { createVegetableSystem } from './vegetables.js'
import { enableAnimalSounds, playAnimalHitSound, setAnimalSoundsEnabled } from './animalSounds.js'
import { enableImpactSounds, playImpactSound, setImpactSoundsEnabled } from './impactSounds.js'
import { enableGameEndSound, playGameEndSound, setGameEndSoundEnabled } from './gameEndSound.js'

window.addEventListener('beforeunload', clearRuns)

const socket = io('https://max-farm-smash.onrender.com');

socket.on('connect', () => {
  console.log('Connected to server! My id is:', socket.id)
})

socket.on('disconnect', () => {
  console.log('Disconnected from server')
})

const { scene, camera, renderer, projectileBlockers } = createScene()
const truck = createTruck(scene)

// send our position to the server, a few times per second (not every frame - that's excessive)
setInterval(() => {
  if (socket.connected) {
    socket.emit('updatePosition', {
      x: truck.mesh.position.x,
      y: truck.mesh.position.y,
      z: truck.mesh.position.z,
      rotation: truck.mesh.rotation.y,
      name: playerName,
      color: selectedTruckColor,
      health: gameState.health,
    })
  }
}, 100) // every 100ms = 10 times per second

const otherPlayers = {} // id -> truck object (same shape createTruck returns) for every other player

// when we first connect, spawn trucks for anyone already in the game
socket.on('currentPlayers', (players) => {
  for (const id in players) {
    if (id !== socket.id) {
      spawnOtherPlayer(id, players[id])
    }
  }
})

// when another player moves, either spawn them (first time we see them) or update their position
socket.on('playerMoved', (data) => {
  if (!otherPlayers[data.id]) {
    spawnOtherPlayer(data.id, data)
  } else {
    const other = otherPlayers[data.id]
    other.mesh.position.set(data.x, data.y, data.z)
    other.mesh.rotation.y = data.rotation
    if (data.color && data.color !== other.color) {
      setTruckColor(other, data.color)
      other.color = data.color
    }
    other.playerName = data.name || other.playerName || 'Player'
    if (Number.isFinite(data.health)) updateTruckHealth(other, data.health)
  }
})

// when a player leaves, remove their truck from the scene
socket.on('playerLeft', (id) => {
  if (otherPlayers[id]) {
    scene.remove(otherPlayers[id].mesh)
    delete otherPlayers[id]
  }
})

function spawnOtherPlayer(id, data) {
  const otherTruck = createTruck(scene) // reuses the same truck-building function as our own truck
  otherTruck.mesh.position.set(data.x, data.y, data.z)
  otherTruck.mesh.rotation.y = data.rotation
  setTruckColor(otherTruck, data.color || 'blue')
  otherTruck.color = data.color || 'blue'
  otherTruck.playerName = data.name || 'Player'
  otherTruck.pvpCrashCooldown = 0
  if (Number.isFinite(data.health)) updateTruckHealth(otherTruck, data.health)
  otherPlayers[id] = otherTruck
}

// cosmetic-only projectiles for other players' shots (hit detection stays local to the shooter's client)
const remoteProjectiles = []
const REMOTE_PROJECTILE_SPEED = 20
const REMOTE_PROJECTILE_LIFETIME = 4
const remoteProjectileGeometry = new THREE.SphereGeometry(0.22, 8, 8)
const remoteProjectileMaterial = new THREE.MeshBasicMaterial({ color: 0x42baff })

// when another player fires, spawn a visual-only projectile for their shot
socket.on('otherPlayerShoot', (data) => {
  const direction = new THREE.Vector3(Math.sin(data.rotation), 0, Math.cos(data.rotation))
  const mesh = new THREE.Mesh(remoteProjectileGeometry, remoteProjectileMaterial)
  mesh.position.set(data.x, data.y + 1.5, data.z).addScaledVector(direction, 2.2)
  scene.add(mesh)
  remoteProjectiles.push({ mesh, velocity: direction.multiplyScalar(REMOTE_PROJECTILE_SPEED), life: 0 })
})

// when the server tells you that YOU got hit
socket.on('youWereHit', (data) => {
  console.log('[pvp] youWereHit received:', data)
  takeDamage(data.damage)
  const shooter = otherPlayers[data.fromId]
  const recoil = shooter
    ? new THREE.Vector3().subVectors(truck.mesh.position, shooter.mesh.position).setY(0)
    : new THREE.Vector3(0, 0, 1)
  if (recoil.lengthSq() < 0.001) recoil.set(0, 0, 1)
  else recoil.normalize()
  applyTruckImpact(truck, recoil, data.force || 4)
  playImpactSound('truck')
})
const input = createInput()
const collisionSystem = createCollisionSystem(scene)
const gameState = createGameState()
const enemySystem = createEnemySystem(scene, projectileBlockers)
const vegetableSystem = createVegetableSystem(scene)

let farmObjects = createFarmObjects(scene)
let farmTrees = createFarmTrees(scene, projectileBlockers)
let gameOverShown = false
let started = false
let playerName = 'Player'
let selectedTruckColor = 'red'
let difficultyMultiplier = 1
let selectedEnemyCount = 5
let currentMultiplayerRun = null

const ui = createUI({
  onStart: startGame,
  onPlayAgain: returnToStart,
  onSoundChange: setSoundEnabled,
  onTruckColorChange: (color) => {
    selectedTruckColor = color
    setTruckColor(truck, color)
  },
  onDurationChange: (seconds) => setGameDuration(gameState, seconds),
  onDifficultyChange: setDifficulty,
  onEnemyCountChange: (count) => { selectedEnemyCount = count },
  farmSize: ROOM_SIZE,
})

socket.on('leaderboardUpdated', ({ leaderboard, total }) => {
  if (!gameOverShown || !currentMultiplayerRun) return
  const rank = leaderboard.findIndex((run) => run.id === currentMultiplayerRun.id) + 1
  ui.updateLeaderboard(rank || total, total, leaderboard, currentMultiplayerRun)
})

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
    const hitFence = updateTruck(truck, input, delta, isMaxMode(gameState))
    if (hitFence && Math.abs(truck.speed) > 1) playImpactSound('fence')
    checkSolidSceneryCollision()
    checkMultiplayerTruckCollisions(delta)
    collisionSystem.checkCollisions(truck, farmObjects, (points, animal) => {
      addScore(gameState, points)
      chargeMax(8)
      if (recordAnimalKill(gameState)) {
        enemySystem.activateMaxMode(3)
        ui.showEnemyMaxMode()
      }
      takeDamage(10)
      playAnimalHitSound(animal.mesh.userData.animalType)
      const recoil = new THREE.Vector3().subVectors(truck.mesh.position, animal.mesh.position).setY(0)
      if (recoil.lengthSq() < 0.001) {
        recoil.set(-Math.sin(truck.heading), 0, -Math.cos(truck.heading))
      } else {
        recoil.normalize()
      }
      truck.speed *= 0.65
      applyTruckImpact(truck, recoil, 5)
    })
    collisionSystem.checkCollisions(truck, farmTrees, (_points, tree) => {
      if (tree.projectileBlocker) tree.projectileBlocker.active = false
      const recoil = new THREE.Vector3().subVectors(truck.mesh.position, tree.mesh.position).setY(0)
      if (recoil.lengthSq() < 0.001) recoil.set(-Math.sin(truck.heading), 0, -Math.cos(truck.heading))
      else recoil.normalize()
      truck.speed *= 0.55
      applyTruckImpact(truck, recoil, 7)
      playImpactSound('tree')
      chargeMax(12)
    })
    enemySystem.update(
      delta,
      truck,
      (direction, damage) => {
        takeDamage(damage)
        applyTruckImpact(truck, direction, 4)
      },
      (amount, direction, force = 10) => {
        takeDamage(amount)
        applyTruckImpact(truck, direction, force)
        playImpactSound('truck')
      },
      (points) => {
        addScore(gameState, points)
        recordDestroyedTruck(gameState)
        const bonus = addTime(gameState, 3)
        if (bonus > 0) ui.showTimeBonus(bonus)
        chargeMax(35)
      },
      input.shoot,
      (type) => playImpactSound(type),
      isMaxMode(gameState),
      () => {
        // tell the server we fired, so other clients can see the projectile too
        socket.emit('playerShoot', {
          x: truck.mesh.position.x,
          y: truck.mesh.position.y,
          z: truck.mesh.position.z,
          rotation: truck.mesh.rotation.y
        })
      },
      otherPlayers,
      (targetId) => {
        console.log('[pvp] local hit detected on', targetId, '- emitting hitPlayer')
        socket.emit('hitPlayer', { targetId, damage: 15, type: 'bullet', force: 4 })
      },
      difficultyMultiplier * (1 + Math.min(gameState.elapsedTime / 90, 0.55)),
    )
    vegetableSystem.update(delta, truck, (amount, type) => {
      const healed = healPlayer(gameState, amount)
      ui.showPickup(type, healed)
      if (healed > 0) chargeMax(10)
      return healed > 0
    })
  }
  collisionSystem.updateFlyingObjects(delta)
  for (let i = remoteProjectiles.length - 1; i >= 0; i--) {
    const projectile = remoteProjectiles[i]
    projectile.mesh.position.addScaledVector(projectile.velocity, delta)
    projectile.life += delta
    if (projectile.life >= REMOTE_PROJECTILE_LIFETIME) {
      scene.remove(projectile.mesh)
      remoteProjectiles.splice(i, 1)
    }
  }
  updateCamera(delta)

  ui.updateHUD(
    gameState.score,
    gameState.timeRemaining,
    gameState.health,
    gameState.destroyedTrucks,
    gameState.maxCharge,
    gameState.maxModeRemaining,
  )
  updateTruckHealth(truck, gameState.health)
  ui.updateMinimap(
    truck.mesh.position,
    truck.heading,
    enemySystem.getPositions(),
    farmObjects.filter((animal) => !animal.destroyed).map((animal) => animal.mesh.position),
    vegetableSystem.getPositions(),
    Object.values(otherPlayers).map((other) => other.mesh.position),
  )

  if (started && gameState.isOver && !gameOverShown) {
    gameOverShown = true
    playGameEndSound(gameState.endReason)
    enemySystem.clearProjectiles()
    showSharedResults()
  }

  renderer.render(scene, camera)
}

function startGame(name) {
  enableAnimalSounds()
  enableImpactSounds()
  enableGameEndSound()
  playerName = name
  currentMultiplayerRun = null
  resetGameState(gameState)
  resetTruck(truck)
  clearFarmObjects(scene, farmObjects)
  clearFarmTrees(scene, farmTrees)
  farmObjects = createFarmObjects(scene)
  farmTrees = createFarmTrees(scene, projectileBlockers)
  collisionSystem.reset()
  enemySystem.spawn(selectedEnemyCount, truck.mesh.position)
  vegetableSystem.spawn()
  gameOverShown = false
  started = true
  cameraShake = 0
  ui.hideStart()
  ui.hideGameOver()
  ui.updateHUD(
    gameState.score,
    gameState.timeRemaining,
    gameState.health,
    gameState.destroyedTrucks,
    gameState.maxCharge,
    gameState.maxModeRemaining,
  )
  updateTruckHealth(truck, gameState.health)
  snapCamera()
}

function showSharedResults() {
  const runId = `${socket.id || 'offline'}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
  const result = {
    runId,
    name: playerName,
    score: gameState.score,
    destroyedTrucks: gameState.destroyedTrucks,
  }

  const showResults = ({ rank, total, leaderboard, run }) => {
    currentMultiplayerRun = run || leaderboard.find((entry) => entry.id === runId) || { id: runId, ...result }
    ui.showGameOver(
      gameState.score,
      rank,
      total,
      leaderboard,
      currentMultiplayerRun,
      gameState.endReason,
      gameState.destroyedTrucks,
    )
  }

  if (!socket.connected) {
    showResults(recordRun(playerName, gameState.score))
    return
  }

  socket.timeout(2500).emit('submitScore', result, (error, response) => {
    if (error || !response?.leaderboard) {
      showResults(recordRun(playerName, gameState.score))
      return
    }
    showResults(response)
  })
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

function checkMultiplayerTruckCollisions(delta) {
  for (const [id, other] of Object.entries(otherPlayers)) {
    other.pvpCrashCooldown = Math.max(0, (other.pvpCrashCooldown || 0) - delta)

    const separation = new THREE.Vector3().subVectors(truck.mesh.position, other.mesh.position).setY(0)
    const collisionDistance = truck.halfLength + other.halfLength
    if (separation.lengthSq() >= collisionDistance * collisionDistance || other.pvpCrashCooldown > 0) continue

    // Only one of the two clients resolves the shared collision, preventing double damage.
    if (!socket.id || socket.id.localeCompare(id) > 0) continue

    if (separation.lengthSq() < 0.001) separation.set(1, 0, 0)
    else separation.normalize()

    const crashDamage = 12
    const impactForce = Math.max(9, Math.abs(truck.speed) * 0.8)
    other.pvpCrashCooldown = 1
    truck.mesh.position.addScaledVector(separation, 0.8)
    truck.speed *= -0.55
    takeDamage(crashDamage)
    applyTruckImpact(truck, separation, impactForce)
    playImpactSound('truck')
    socket.emit('hitPlayer', {
      targetId: id,
      damage: crashDamage,
      type: 'crash',
      force: impactForce,
    })
  }
}

function setSoundEnabled(enabled) {
  setAnimalSoundsEnabled(enabled)
  setImpactSoundsEnabled(enabled)
  setGameEndSoundEnabled(enabled)
}

function setDifficulty(level) {
  const multipliers = { easy: 0.75, medium: 1, hard: 1.2, expert: 1.45 }
  difficultyMultiplier = multipliers[level] ?? 1
}

function chargeMax(amount) {
  if (addMaxCharge(gameState, amount)) ui.showMaxMode()
}

function checkSolidSceneryCollision() {
  for (const blocker of projectileBlockers) {
    if (blocker.kind !== 'barn' && blocker.kind !== 'silo') continue
    const away = new THREE.Vector3(
      truck.mesh.position.x - blocker.x,
      0,
      truck.mesh.position.z - blocker.z,
    )
    const distance = away.length()
    const collisionDistance = blocker.radius + 1.35
    if (distance >= collisionDistance) continue
    if (distance < 0.001) away.set(1, 0, 0)
    else away.divideScalar(distance)
    truck.mesh.position.addScaledVector(away, collisionDistance - distance)
    truck.speed *= -0.3
    applyTruckImpact(truck, away, 6)
    playImpactSound(blocker.kind === 'silo' ? 'metal' : 'object')
  }
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
