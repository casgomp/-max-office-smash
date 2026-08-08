import * as THREE from 'three'
import { ROOM_SIZE, WALL_THICKNESS, getFarmBumpHeight } from './scene.js'
import { createHealthBar, updateHealthBar } from './healthBar.js'

const ENEMY_COUNT = 5
const MOVE_SPEED = 7
const TURN_SPEED = 2.8
const ACCELERATION_RESPONSE = 3.5
const KEEP_DISTANCE = 9
const FIRE_RANGE = 24
const FIRE_COOLDOWN = 1.15
const PROJECTILE_SPEED = 14
const PROJECTILE_LIFETIME = 4
const HIT_RADIUS = 1.25
const TRUCK_COLLISION_RADIUS = 2.25
const CRASH_DAMAGE = 30
const ENEMY_CRASH_DAMAGE = 35
const CRASH_DURATION = 1.1
const DEBRIS_LIFETIME = 1.6
const PLAYER_FIRE_COOLDOWN = 0.4
const PLAYER_PROJECTILE_SPEED = 20
const PLAYER_PROJECTILE_DAMAGE = 40
const ENEMY_HEALTH = 100
const ENEMY_HIT_RADIUS = 1.8
const ROOM_BOUND = ROOM_SIZE / 2 - WALL_THICKNESS - 1

const spawnPoints = [
  [-48, -42],
  [48, -42],
  [0, 52],
  [-58, 30],
  [58, 28],
]
const ENEMY_COLORS = [
  { body: 0x2457c5, accent: 0x4f8cff },
  { body: 0x7b2cbf, accent: 0xb05cff },
  { body: 0x16856b, accent: 0x2dcc9d },
  { body: 0xd16b16, accent: 0xffa12f },
  { body: 0x9c2340, accent: 0xee496c },
]

export function createEnemySystem(scene, projectileBlockers = []) {
  const enemies = []
  const projectiles = []
  const playerProjectiles = []
  const debrisPieces = []
  const muzzleFlashes = []
  const graves = []
  let playerFireCooldown = 0
  let nextEnemyIndex = ENEMY_COUNT
  const projectileGeometry = new THREE.SphereGeometry(0.2, 12, 8)
  const projectileMaterial = new THREE.MeshStandardMaterial({
    color: 0xff7b22,
    emissive: 0xff3300,
    emissiveIntensity: 2,
  })
  const playerProjectileMaterial = new THREE.MeshStandardMaterial({
    color: 0x62c8ff,
    emissive: 0x168cff,
    emissiveIntensity: 2.2,
  })

  function createEnemy(x, z, index) {
    const group = new THREE.Group()
    const colors = ENEMY_COLORS[index % ENEMY_COLORS.length]
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.65 })
    const accentMaterial = new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.55 })
    const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x111827 })
    const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x17263a, metalness: 0.2 })
    const chromeMaterial = new THREE.MeshStandardMaterial({ color: 0xb9c0c9, metalness: 0.7 })
    const lightMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff0a8,
      emissive: 0xffcc44,
      emissiveIntensity: 0.6,
    })

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 3.5), bodyMaterial)
    body.position.y = 1.25
    body.castShadow = true
    group.add(body)

    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.25, 1.55), accentMaterial)
    cab.position.set(0, 2.05, -0.25)
    cab.castShadow = true
    group.add(cab)

    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 1.25), accentMaterial)
    hood.position.set(0, 1.7, 1.25)
    hood.castShadow = true
    group.add(hood)

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.06), glassMaterial)
    windshield.position.set(0, 2.25, 0.55)
    group.add(windshield)

    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.25, 0.25), chromeMaterial)
    frontBumper.position.set(0, 1.05, 1.85)
    group.add(frontBumper)

    for (const lightX of [-0.65, 0.65]) {
      const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.23, 0.08), lightMaterial)
      headlight.position.set(lightX, 1.55, 1.89)
      group.add(headlight)
    }

    const exhaustGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.3, 8)
    for (const exhaustX of [-0.82, 0.82]) {
      const exhaust = new THREE.Mesh(exhaustGeometry, darkMaterial)
      exhaust.position.set(exhaustX, 2.25, -1.25)
      group.add(exhaust)
    }

    const wheelGeometry = new THREE.CylinderGeometry(0.65, 0.65, 0.45, 16)
    for (const wheelX of [-1.15, 1.15]) {
      for (const wheelZ of [-1.1, 1.1]) {
        const wheel = new THREE.Mesh(wheelGeometry, darkMaterial)
        wheel.rotation.z = Math.PI / 2
        wheel.position.set(wheelX, 0.65, wheelZ)
        wheel.castShadow = true
        group.add(wheel)
      }
    }

    group.position.set(x, 0, z)
    const healthBar = createHealthBar(group, 3.9)
    scene.add(group)
    enemies.push({
      mesh: group,
      cooldown: 0.45 + index * 0.25,
      heading: group.rotation.y,
      speed: 0,
      crashTimer: 0,
      crashCooldown: 0,
      crashVelocity: new THREE.Vector3(),
      crashSpin: 0,
      health: ENEMY_HEALTH,
      healthBar,
      shotRecoil: 0,
    })
  }

  function spawn() {
    clear()
    for (let i = 0; i < ENEMY_COUNT; i++) {
      createEnemy(...spawnPoints[i], i)
    }
    nextEnemyIndex = ENEMY_COUNT
  }

  function createGrave(position) {
    const grave = new THREE.Group()
    const rust = new THREE.MeshStandardMaterial({ color: 0x6f3524, metalness: 0.35, roughness: 0.95 })
    const burntMetal = new THREE.MeshStandardMaterial({ color: 0x25282a, metalness: 0.55, roughness: 0.85 })
    const brokenGlass = new THREE.MeshStandardMaterial({ color: 0x17232b, roughness: 0.35 })

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.48, 3.3), rust)
    chassis.position.y = 0.55
    chassis.rotation.z = 0.1
    chassis.castShadow = true
    grave.add(chassis)

    const crushedCab = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.7, 1.35), burntMetal)
    crushedCab.position.set(0.18, 1.05, -0.3)
    crushedCab.rotation.set(-0.12, 0.08, -0.16)
    crushedCab.castShadow = true
    grave.add(crushedCab)

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.38, 0.06), brokenGlass)
    windshield.position.set(0.18, 1.12, 0.4)
    windshield.rotation.z = -0.16
    grave.add(windshield)

    const wheelGeometry = new THREE.CylinderGeometry(0.48, 0.48, 0.35, 12)
    for (const [x, z, tilt] of [[-1.15, 0.9, 0.2], [1.45, -0.85, 1.15], [-1.55, -1.35, 0.8]]) {
      const wheel = new THREE.Mesh(wheelGeometry, burntMetal)
      wheel.position.set(x, 0.35, z)
      wheel.rotation.set(Math.PI / 2, tilt, Math.PI / 2)
      wheel.castShadow = true
      grave.add(wheel)
    }

    for (let i = 0; i < 4; i++) {
      const scrap = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 0.42), i % 2 ? rust : burntMetal)
      scrap.position.set(THREE.MathUtils.randFloatSpread(4), 0.08, THREE.MathUtils.randFloatSpread(4))
      scrap.rotation.set(Math.random(), Math.random() * Math.PI, Math.random())
      grave.add(scrap)
    }
    grave.position.set(position.x, 0, position.z)
    grave.rotation.y = Math.random() * Math.PI * 2
    scene.add(grave)
    graves.push(grave)
  }

  function respawnEnemy(playerPosition) {
    let x = 0
    let z = 0
    for (let attempt = 0; attempt < 40; attempt++) {
      x = THREE.MathUtils.randFloatSpread(ROOM_BOUND * 1.8)
      z = THREE.MathUtils.randFloatSpread(ROOM_BOUND * 1.8)
      const farFromPlayer = Math.hypot(x - playerPosition.x, z - playerPosition.z) > 28
      const farFromEnemies = enemies.every(
        (enemy) => Math.hypot(x - enemy.mesh.position.x, z - enemy.mesh.position.z) > 10,
      )
      if (farFromPlayer && farFromEnemies) break
    }
    createEnemy(x, z, nextEnemyIndex++)
  }

  function destroyEnemy(enemy, playerPosition, onEnemyDestroyed) {
    createGrave(enemy.mesh.position)
    scene.remove(enemy.mesh)
    const index = enemies.indexOf(enemy)
    if (index !== -1) enemies.splice(index, 1)
    onEnemyDestroyed(200)
    respawnEnemy(playerPosition)
  }

  function fire(enemy, direction) {
    const mesh = createProjectileVisual(projectileMaterial, 0xff5b22, direction)
    mesh.position.copy(enemy.mesh.position).setY(1.5).addScaledVector(direction, 2.2)
    scene.add(mesh)
    projectiles.push({ mesh, velocity: direction.clone().multiplyScalar(PROJECTILE_SPEED), life: 0 })
    enemy.shotRecoil = 0.13
    createMuzzleFlash(mesh.position, 0xff7b22)
  }

  function firePlayer(playerTruck) {
    const direction = new THREE.Vector3(
      Math.sin(playerTruck.heading),
      0,
      Math.cos(playerTruck.heading),
    )
    const mesh = createProjectileVisual(playerProjectileMaterial, 0x42baff, direction)
    mesh.position.copy(playerTruck.mesh.position).setY(playerTruck.mesh.position.y + 1.5)
    mesh.position.addScaledVector(direction, 2.2)
    scene.add(mesh)
    playerProjectiles.push({
      mesh,
      velocity: direction.multiplyScalar(PLAYER_PROJECTILE_SPEED),
      life: 0,
    })
    playerTruck.shotRecoil = 0.11
    createMuzzleFlash(mesh.position, 0x42baff)
  }

  function createProjectileVisual(coreMaterial, glowColor, direction) {
    const group = new THREE.Group()
    const core = new THREE.Mesh(projectileGeometry, coreMaterial)
    core.castShadow = true
    group.add(core)
    const trail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.1, 1.05, 8),
      new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.58 }),
    )
    trail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction)
    trail.position.addScaledVector(direction, -0.58)
    group.add(trail)
    return group
  }

  function createMuzzleFlash(position, color) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 10, 7),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
    )
    mesh.position.copy(position)
    scene.add(mesh)
    muzzleFlashes.push({ mesh, life: 0 })
  }

  function update(delta, playerTruck, onHit, onCrash, onEnemyDestroyed, playerShooting) {
    const target = playerTruck.mesh.position
    playerFireCooldown = Math.max(0, playerFireCooldown - delta)
    if (playerShooting && playerFireCooldown <= 0) {
      firePlayer(playerTruck)
      playerFireCooldown = PLAYER_FIRE_COOLDOWN
    }

    for (const enemy of enemies) {
      enemy.crashCooldown = Math.max(0, enemy.crashCooldown - delta)
      if (enemy.crashTimer > 0) {
        enemy.crashTimer -= delta
        enemy.mesh.position.addScaledVector(enemy.crashVelocity, delta)
        enemy.crashVelocity.multiplyScalar(Math.exp(-3.5 * delta))
        enemy.heading += enemy.crashSpin * delta
        enemy.mesh.rotation.y = enemy.heading
        enemy.mesh.position.x = THREE.MathUtils.clamp(enemy.mesh.position.x, -ROOM_BOUND, ROOM_BOUND)
        enemy.mesh.position.z = THREE.MathUtils.clamp(enemy.mesh.position.z, -ROOM_BOUND, ROOM_BOUND)
        enemy.mesh.position.y = getFarmBumpHeight(enemy.mesh.position.x, enemy.mesh.position.z)
        continue
      }

      const direction = new THREE.Vector3().subVectors(target, enemy.mesh.position).setY(0)
      const distance = direction.length()
      if (distance === 0) continue
      direction.normalize()

      const targetHeading = Math.atan2(direction.x, direction.z)
      const angleDifference = Math.atan2(
        Math.sin(targetHeading - enemy.heading),
        Math.cos(targetHeading - enemy.heading),
      )
      enemy.heading += THREE.MathUtils.clamp(angleDifference, -TURN_SPEED * delta, TURN_SPEED * delta)
      enemy.mesh.rotation.y = enemy.heading
      enemy.shotRecoil *= Math.exp(-14 * delta)
      enemy.mesh.rotation.x = -enemy.shotRecoil

      const desiredSpeed = distance > KEEP_DISTANCE ? MOVE_SPEED : 0
      const speedBlend = 1 - Math.exp(-ACCELERATION_RESPONSE * delta)
      enemy.speed = THREE.MathUtils.lerp(enemy.speed, desiredSpeed, speedBlend)
      if (enemy.speed > 0.05) {
        const forward = new THREE.Vector3(Math.sin(enemy.heading), 0, Math.cos(enemy.heading))
        enemy.mesh.position.addScaledVector(forward, enemy.speed * delta)
        enemy.mesh.position.x = THREE.MathUtils.clamp(enemy.mesh.position.x, -ROOM_BOUND, ROOM_BOUND)
        enemy.mesh.position.z = THREE.MathUtils.clamp(enemy.mesh.position.z, -ROOM_BOUND, ROOM_BOUND)
      }
      enemy.mesh.position.y = getFarmBumpHeight(enemy.mesh.position.x, enemy.mesh.position.z)

      const separation = new THREE.Vector3().subVectors(enemy.mesh.position, target).setY(0)
      const truckDistance = separation.length()
      if (truckDistance < TRUCK_COLLISION_RADIUS && enemy.crashCooldown <= 0) {
        if (truckDistance < 0.001) separation.set(1, 0, 0)
        else separation.divideScalar(truckDistance)

        const overlap = TRUCK_COLLISION_RADIUS - truckDistance
        enemy.mesh.position.addScaledVector(separation, overlap * 0.55)
        playerTruck.mesh.position.addScaledVector(separation, -overlap * 0.45)
        playerTruck.speed *= -0.5
        playerTruck.verticalVelocity = Math.max(playerTruck.verticalVelocity, 2.5)

        enemy.speed = 0
        enemy.crashTimer = CRASH_DURATION
        enemy.crashCooldown = 2
        enemy.crashVelocity.copy(separation).multiplyScalar(7)
        enemy.crashSpin = (Math.random() < 0.5 ? -1 : 1) * THREE.MathUtils.randFloat(3.5, 5.5)
        enemy.health = Math.max(0, enemy.health - ENEMY_CRASH_DAMAGE)
        updateHealthBar(enemy.healthBar, enemy.health)
        createAccidentEffect(enemy.mesh.position, separation)
        onCrash(CRASH_DAMAGE, separation.clone().negate())
        if (enemy.health === 0) {
          destroyEnemy(enemy, target, onEnemyDestroyed)
        }
        continue
      }

      enemy.cooldown -= delta
      if (distance <= FIRE_RANGE && enemy.cooldown <= 0) {
        fire(enemy, direction)
        enemy.cooldown = FIRE_COOLDOWN + Math.random() * 0.35
      }
    }

    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {
        const first = enemies[i]
        const second = enemies[j]
        const separation = new THREE.Vector3().subVectors(second.mesh.position, first.mesh.position).setY(0)
        const distance = separation.length()
        if (distance >= TRUCK_COLLISION_RADIUS || first.crashCooldown > 0 || second.crashCooldown > 0) continue
        if (distance < 0.001) separation.set(1, 0, 0)
        else separation.divideScalar(distance)

        const overlap = (TRUCK_COLLISION_RADIUS - distance) / 2
        first.mesh.position.addScaledVector(separation, -overlap)
        second.mesh.position.addScaledVector(separation, overlap)
        for (const [enemy, direction] of [[first, -1], [second, 1]]) {
          enemy.speed = 0
          enemy.crashTimer = CRASH_DURATION
          enemy.crashCooldown = 2
          enemy.crashVelocity.copy(separation).multiplyScalar(direction * 5)
          enemy.crashSpin = direction * THREE.MathUtils.randFloat(3, 5)
        }
        const crashPoint = first.mesh.position.clone().add(second.mesh.position).multiplyScalar(0.5)
        createAccidentEffect(crashPoint, separation)
      }
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const projectile = projectiles[i]
      projectile.mesh.position.addScaledVector(projectile.velocity, delta)
      projectile.life += delta

      const dx = projectile.mesh.position.x - target.x
      const dz = projectile.mesh.position.z - target.z
      const hitPlayer = dx * dx + dz * dz <= HIT_RADIUS * HIT_RADIUS
      const outOfBounds = Math.abs(projectile.mesh.position.x) > ROOM_BOUND || Math.abs(projectile.mesh.position.z) > ROOM_BOUND
      const hitScenery = hitsScenery(projectile.mesh.position)
      if (hitPlayer) onHit(projectile.velocity.clone().normalize())
      if (hitScenery) createMuzzleFlash(projectile.mesh.position, 0xff7b22)
      if (hitPlayer || hitScenery || outOfBounds || projectile.life >= PROJECTILE_LIFETIME) {
        scene.remove(projectile.mesh)
        projectiles.splice(i, 1)
      }
    }

    for (let i = playerProjectiles.length - 1; i >= 0; i--) {
      const projectile = playerProjectiles[i]
      projectile.mesh.position.addScaledVector(projectile.velocity, delta)
      projectile.life += delta

      let hitEnemy = null
      for (const enemy of enemies) {
        const dx = projectile.mesh.position.x - enemy.mesh.position.x
        const dz = projectile.mesh.position.z - enemy.mesh.position.z
        if (dx * dx + dz * dz <= ENEMY_HIT_RADIUS * ENEMY_HIT_RADIUS) {
          hitEnemy = enemy
          break
        }
      }

      if (hitEnemy) {
        hitEnemy.health -= PLAYER_PROJECTILE_DAMAGE
        updateHealthBar(hitEnemy.healthBar, hitEnemy.health)
        hitEnemy.crashTimer = Math.max(hitEnemy.crashTimer, 0.25)
        hitEnemy.crashVelocity.copy(projectile.velocity).normalize().multiplyScalar(2.5)
        createAccidentEffect(projectile.mesh.position, projectile.velocity.clone().normalize())
        if (hitEnemy.health <= 0) {
          destroyEnemy(hitEnemy, target, onEnemyDestroyed)
        }
      }

      const outOfBounds = Math.abs(projectile.mesh.position.x) > ROOM_BOUND
        || Math.abs(projectile.mesh.position.z) > ROOM_BOUND
      const hitScenery = hitsScenery(projectile.mesh.position)
      if (hitScenery) createMuzzleFlash(projectile.mesh.position, 0x42baff)
      if (hitEnemy || hitScenery || outOfBounds || projectile.life >= PROJECTILE_LIFETIME) {
        scene.remove(projectile.mesh)
        playerProjectiles.splice(i, 1)
      }
    }

    updateDebris(delta)
    updateMuzzleFlashes(delta)
  }

  function hitsScenery(position) {
    for (const blocker of projectileBlockers) {
      const dx = position.x - blocker.x
      const dz = position.z - blocker.z
      if (dx * dx + dz * dz <= blocker.radius * blocker.radius) return true
    }
    return false
  }

  function updateMuzzleFlashes(delta) {
    for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
      const flash = muzzleFlashes[i]
      flash.life += delta
      flash.mesh.scale.setScalar(1 + flash.life * 8)
      flash.mesh.material.opacity = Math.max(0, 1 - flash.life * 10)
      if (flash.life >= 0.12) {
        scene.remove(flash.mesh)
        muzzleFlashes.splice(i, 1)
      }
    }
  }

  function createAccidentEffect(position, direction) {
    const colors = [0xff9f1c, 0xffd166, 0x555b66, 0xd7dde5]
    for (let i = 0; i < 14; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 0.12),
        new THREE.MeshStandardMaterial({
          color: colors[i % colors.length],
          emissive: i < 7 ? colors[i % 2] : 0x000000,
          emissiveIntensity: i < 7 ? 1.2 : 0,
        }),
      )
      mesh.position.copy(position).setY(1.2)
      scene.add(mesh)
      debrisPieces.push({
        mesh,
        velocity: new THREE.Vector3(
          direction.x * 3 + THREE.MathUtils.randFloatSpread(8),
          THREE.MathUtils.randFloat(3, 8),
          direction.z * 3 + THREE.MathUtils.randFloatSpread(8),
        ),
        spin: new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(10),
          THREE.MathUtils.randFloatSpread(10),
          THREE.MathUtils.randFloatSpread(10),
        ),
        life: 0,
      })
    }
  }

  function updateDebris(delta) {
    for (let i = debrisPieces.length - 1; i >= 0; i--) {
      const debris = debrisPieces[i]
      debris.velocity.y -= 15 * delta
      debris.mesh.position.addScaledVector(debris.velocity, delta)
      debris.mesh.rotation.x += debris.spin.x * delta
      debris.mesh.rotation.y += debris.spin.y * delta
      debris.mesh.rotation.z += debris.spin.z * delta
      debris.life += delta
      if (debris.mesh.position.y < 0 || debris.life >= DEBRIS_LIFETIME) {
        scene.remove(debris.mesh)
        debrisPieces.splice(i, 1)
      }
    }
  }

  function clearProjectiles() {
    for (const projectile of projectiles) scene.remove(projectile.mesh)
    projectiles.length = 0
    for (const projectile of playerProjectiles) scene.remove(projectile.mesh)
    playerProjectiles.length = 0
    playerFireCooldown = 0
    for (const debris of debrisPieces) scene.remove(debris.mesh)
    debrisPieces.length = 0
    for (const flash of muzzleFlashes) scene.remove(flash.mesh)
    muzzleFlashes.length = 0
  }

  function clear() {
    for (const enemy of enemies) scene.remove(enemy.mesh)
    enemies.length = 0
    clearProjectiles()
    for (const grave of graves) scene.remove(grave)
    graves.length = 0
  }

  function getPositions() {
    return enemies.map((enemy) => enemy.mesh.position)
  }

  return { spawn, update, clear, clearProjectiles, getPositions }
}
