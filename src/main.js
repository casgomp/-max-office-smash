import * as THREE from 'three'
import { io } from 'socket.io-client'
import './style.css'
import { createScene, ROOM_SIZE } from './scene.js'
import { createTruck, updateTruck, resetTruck, updateTruckHealth, applyTruckImpact } from './truck.js'
import { createInput } from './input.js'
import { createFarmObjects, clearFarmObjects } from './farm.js'
import { createFarmTrees, clearFarmTrees } from './farmTrees.js'
import { createCollisionSystem } from './collision.js'
import { createGameState, updateGameState, addScore, addTime, addMaxCharge, damagePlayer, healPlayer, isMaxMode, recordAnimalKill, recordDestroyedTruck, resetGameState } from './gameState.js'
import { createUI } from './ui.js'
import { recordRun, clearRuns } from './leaderboard.js'
import { createEnemySystem } from './enemies.js'
import { createVegetableSystem } from './vegetables.js'
import { enableAnimalSounds, playAnimalHitSound } from './animalSounds.js'
import { enableImpactSounds, playImpactSound } from './impactSounds.js'

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
      rotation: truck.mesh.rotation.y
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
  // give other players a different body color so you can tell them apart from yourself
  // (truck.mesh is a Group, not a single Mesh, so recolor the body-colored parts via traverse)
  otherTruck.mesh.traverse((child) => {
    if (child.isMesh && child.material.color.getHex() === 0xd23c2e) {
      child.material.color.set(0x3498db)
    }
  })
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
  takeDamage(data.damage)
  const shooter = otherPlayers[data.fromId]
  const recoil = shooter
    ? new THREE.Vector3().subVectors(truck.mesh.position, shooter.mesh.position).setY(0)
    : new THREE.Vector3(0, 0, 1)
  if (recoil.lengthSq() < 0.001) recoil.set(0, 0, 1)
  else recoil.normalize()
  applyTruckImpact(truck, recoil, 4)
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

const ui = createUI({ onStart: startGame, onPlayAgain: returnToStart, farmSize: ROOM_SIZE })

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
      (amount, direction) => {
        takeDamage(amount)
        applyTruckImpact(truck, direction, 10)
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
        socket.emit('hitPlayer', { targetId, damage: 15 })
      },
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
  )

  if (started && gameState.isOver && !gameOverShown) {
    gameOverShown = true
    const { rank, total, leaderboard, run } = recordRun(playerName, gameState.score)
    enemySystem.clearProjectiles()
    ui.showGameOver(
      gameState.score,
      rank,
      total,
      leaderboard,
      run,
      gameState.endReason,
      gameState.destroyedTrucks,
    )
  }

  renderer.render(scene, camera)
}

function startGame(name) {
  enableAnimalSounds()
  enableImpactSounds()
  playerName = name
  resetGameState(gameState)
  resetTruck(truck)
  clearFarmObjects(scene, farmObjects)
  clearFarmTrees(scene, farmTrees)
  farmObjects = createFarmObjects(scene)
  farmTrees = createFarmTrees(scene, projectileBlockers)
  collisionSystem.reset()
  enemySystem.spawn()
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
