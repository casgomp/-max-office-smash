import * as THREE from 'three'
import { ROOM_SIZE, WALL_THICKNESS, getFarmBumpHeight } from './scene.js'
import { createHealthBar, updateHealthBar } from './healthBar.js'

const ACCELERATION = 16
const MAX_SPEED = 17
const TURN_SPEED = 2.2
const FRICTION = 4
const STEER_ANGLE_MAX = 0.5
const SUSPENSION_STRENGTH = 38
const SUSPENSION_DAMPING = 7
const IMPACT_DRAG = 5
const IMPACT_SPIN_DRAG = 6
const BUMP_SPEED_BONUS = 6
const BUMP_ACCELERATION = 14

const ROOM_BOUND = ROOM_SIZE / 2 - WALL_THICKNESS / 2

const MODEL_SCALE = 0.6

const WHEEL_RADIUS = 1.5
const WHEEL_WIDTH = 1.0
const RIM_RADIUS = 0.55
const RIM_WIDTH = 1.06
const HUB_CAP_RADIUS = 0.18
const HUB_CAP_WIDTH = 1.12
const WHEEL_TRACK = 1.3
const WHEEL_FRONT_Z = 1.5
const WHEEL_REAR_Z = -1.5
const AXLE_Y = WHEEL_RADIUS

const CHASSIS_Y = 2.5
const CHASSIS_HALF_HEIGHT = 0.45

const UP = new THREE.Vector3(0, 1, 0)

function createStrut(start, end, radius, material, segments = 8) {
  const direction = new THREE.Vector3().subVectors(end, start)
  const length = direction.length()
  const strut = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material)
  strut.position.copy(start).addScaledVector(direction, 0.5)
  strut.quaternion.setFromUnitVectors(UP, direction.normalize())
  strut.castShadow = true
  return strut
}

export function createTruck(scene) {
  const truckGroup = new THREE.Group()

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xd23c2e })
  const accentMaterial = new THREE.MeshStandardMaterial({ color: 0xf4c542 })
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  const steelMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3d42,
    metalness: 0.7,
    roughness: 0.35,
  })
  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0xcfcfcf,
    metalness: 0.6,
    roughness: 0.3,
  })
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x1b2735 })
  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff2b0,
    emissive: 0xffe066,
    emissiveIntensity: 0.4,
  })
  const taillightMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a1414,
    emissive: 0x8a1414,
    emissiveIntensity: 0.3,
  })

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 3.4), bodyMaterial)
  chassis.position.set(0, CHASSIS_Y, 0)
  chassis.castShadow = true
  chassis.receiveShadow = true
  truckGroup.add(chassis)

  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 1.5), bodyMaterial)
  cab.position.set(0, CHASSIS_Y + 0.9, 0.4)
  cab.castShadow = true
  truckGroup.add(cab)

  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.45, 1.52), glassMaterial)
  glass.position.set(0, CHASSIS_Y + 0.7, 0.4)
  truckGroup.add(glass)

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 3.41), accentMaterial)
  stripe.position.set(0, CHASSIS_Y + 0.46, 0)
  truckGroup.add(stripe)

  const bumperGeometry = new THREE.BoxGeometry(2.2, 0.3, 0.25)
  const frontBumper = new THREE.Mesh(bumperGeometry, chromeMaterial)
  frontBumper.position.set(0, CHASSIS_Y - 0.35, 1.8)
  truckGroup.add(frontBumper)

  const rearBumper = new THREE.Mesh(bumperGeometry, chromeMaterial)
  rearBumper.position.set(0, CHASSIS_Y - 0.35, -1.8)
  truckGroup.add(rearBumper)

  const headlightGeometry = new THREE.BoxGeometry(0.28, 0.22, 0.08)
  for (const x of [-0.7, 0.7]) {
    const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial)
    headlight.position.set(x, CHASSIS_Y - 0.15, 1.71)
    truckGroup.add(headlight)
  }

  const taillightGeometry = new THREE.BoxGeometry(0.24, 0.2, 0.08)
  for (const x of [-0.7, 0.7]) {
    const taillight = new THREE.Mesh(taillightGeometry, taillightMaterial)
    taillight.position.set(x, CHASSIS_Y - 0.15, -1.71)
    truckGroup.add(taillight)
  }

  const postGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8)
  for (const x of [-0.7, 0.7]) {
    const post = new THREE.Mesh(postGeometry, chromeMaterial)
    post.position.set(x, CHASSIS_Y + 1.85, -0.1)
    truckGroup.add(post)
  }

  const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8), chromeMaterial)
  topBar.rotation.z = Math.PI / 2
  topBar.position.set(0, CHASSIS_Y + 2.3, -0.1)
  truckGroup.add(topBar)

  const exhaustGeometry = new THREE.CylinderGeometry(0.07, 0.07, 1.0, 8)
  for (const x of [-0.6, 0.6]) {
    const exhaust = new THREE.Mesh(exhaustGeometry, darkMaterial)
    exhaust.position.set(x, CHASSIS_Y + 0.9, -1.5)
    truckGroup.add(exhaust)
  }

  const spareTire = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 20), darkMaterial)
  spareTire.position.set(0, CHASSIS_Y + 0.65, -1.0)
  spareTire.castShadow = true
  truckGroup.add(spareTire)

  const spareRim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.42, 12), accentMaterial)
  spareRim.position.copy(spareTire.position)
  truckGroup.add(spareRim)

  const chassisBottomY = CHASSIS_Y - CHASSIS_HALF_HEIGHT

  for (const z of [WHEEL_FRONT_Z, WHEEL_REAR_Z]) {
    const axle = createStrut(
      new THREE.Vector3(-WHEEL_TRACK, AXLE_Y, z),
      new THREE.Vector3(WHEEL_TRACK, AXLE_Y, z),
      0.13,
      steelMaterial,
    )
    truckGroup.add(axle)

    for (const x of [-WHEEL_TRACK, WHEEL_TRACK]) {
      const shockTop = new THREE.Vector3(x * 0.7, chassisBottomY, z + (z > 0 ? -0.25 : 0.25))
      const shockBottom = new THREE.Vector3(x, AXLE_Y + 0.35, z)
      truckGroup.add(createStrut(shockTop, shockBottom, 0.07, chromeMaterial))
    }
  }

  const tireGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 24)
  const rimGeometry = new THREE.CylinderGeometry(RIM_RADIUS, RIM_RADIUS, RIM_WIDTH, 16)
  const hubCapGeometry = new THREE.CylinderGeometry(HUB_CAP_RADIUS, HUB_CAP_RADIUS, HUB_CAP_WIDTH, 12)

  const wheelMounts = [
    { x: -WHEEL_TRACK, z: WHEEL_FRONT_Z, steer: true },
    { x: WHEEL_TRACK, z: WHEEL_FRONT_Z, steer: true },
    { x: -WHEEL_TRACK, z: WHEEL_REAR_Z, steer: false },
    { x: WHEEL_TRACK, z: WHEEL_REAR_Z, steer: false },
  ]

  const wheels = wheelMounts.map(({ x, z, steer }) => {
    const pivot = new THREE.Group()
    pivot.position.set(x, WHEEL_RADIUS, z)
    truckGroup.add(pivot)

    const wheelMesh = new THREE.Group()
    pivot.add(wheelMesh)

    const tire = new THREE.Mesh(tireGeometry, darkMaterial)
    tire.rotation.z = Math.PI / 2
    tire.castShadow = true
    tire.receiveShadow = true
    wheelMesh.add(tire)

    const rim = new THREE.Mesh(rimGeometry, accentMaterial)
    rim.rotation.z = Math.PI / 2
    wheelMesh.add(rim)

    const hubCap = new THREE.Mesh(hubCapGeometry, chromeMaterial)
    hubCap.rotation.z = Math.PI / 2
    wheelMesh.add(hubCap)

    return { pivot, wheelMesh, steer }
  })

  truckGroup.position.set(0, 0, 0)
  truckGroup.scale.setScalar(MODEL_SCALE)
  const healthBar = createHealthBar(truckGroup, 7.2, 4.5)
  scene.add(truckGroup)

  const boundingBox = new THREE.Box3().setFromObject(truckGroup)
  const halfWidth = (boundingBox.max.x - boundingBox.min.x) / 2
  const halfLength = (boundingBox.max.z - boundingBox.min.z) / 2

  return {
    mesh: truckGroup,
    wheels,
    halfWidth,
    halfLength,
    speed: 0,
    heading: 0,
    verticalVelocity: 0,
    impactVelocity: new THREE.Vector3(),
    impactSpin: 0,
    shotRecoil: 0,
    healthBar,
  }
}

export function updateTruckHealth(truck, health) {
  updateHealthBar(truck.healthBar, health)
}

export function resetTruck(truck) {
  truck.speed = 0
  truck.heading = 0
  truck.verticalVelocity = 0
  truck.impactVelocity.set(0, 0, 0)
  truck.impactSpin = 0
  truck.shotRecoil = 0
  truck.mesh.position.set(0, 0, 0)
  truck.mesh.rotation.set(0, 0, 0)
  for (const wheel of truck.wheels) {
    wheel.pivot.rotation.y = 0
    wheel.wheelMesh.rotation.x = 0
  }
}

export function updateTruck(truck, input, delta) {
  if (input.forward) {
    truck.speed += ACCELERATION * delta
  } else if (input.backward) {
    truck.speed -= ACCELERATION * delta
  } else {
    const frictionStep = FRICTION * delta
    if (Math.abs(truck.speed) <= frictionStep) {
      truck.speed = 0
    } else {
      truck.speed -= Math.sign(truck.speed) * frictionStep
    }
  }

  const currentBumpHeight = getFarmBumpHeight(truck.mesh.position.x, truck.mesh.position.z)
  const isOnBump = currentBumpHeight > 0.08
  if (isOnBump && input.forward && truck.speed > 0) {
    truck.speed += BUMP_ACCELERATION * delta
  }
  const currentMaxSpeed = MAX_SPEED + (isOnBump ? BUMP_SPEED_BONUS : 0)
  truck.speed = THREE.MathUtils.clamp(truck.speed, -MAX_SPEED / 2, currentMaxSpeed)

  const turnDirection = (input.left ? 1 : 0) - (input.right ? 1 : 0)
  if (turnDirection !== 0 && truck.speed !== 0) {
    const turnScale = truck.speed / MAX_SPEED
    truck.heading += turnDirection * TURN_SPEED * turnScale * delta
  }

  truck.heading += truck.impactSpin * delta
  truck.impactSpin *= Math.exp(-IMPACT_SPIN_DRAG * delta)
  truck.mesh.rotation.y = truck.heading
  truck.shotRecoil *= Math.exp(-14 * delta)
  truck.mesh.rotation.x = -truck.shotRecoil

  const nextX = truck.mesh.position.x
    + Math.sin(truck.heading) * truck.speed * delta
    + truck.impactVelocity.x * delta
  const nextZ = truck.mesh.position.z
    + Math.cos(truck.heading) * truck.speed * delta
    + truck.impactVelocity.z * delta
  truck.impactVelocity.multiplyScalar(Math.exp(-IMPACT_DRAG * delta))

  const { x: halfX, z: halfZ } = getWorldHalfExtents(truck)

  truck.mesh.position.x = THREE.MathUtils.clamp(nextX, -ROOM_BOUND + halfX, ROOM_BOUND - halfX)
  truck.mesh.position.z = THREE.MathUtils.clamp(nextZ, -ROOM_BOUND + halfZ, ROOM_BOUND - halfZ)

  const groundHeight = getFarmBumpHeight(truck.mesh.position.x, truck.mesh.position.z)
  truck.verticalVelocity += (
    (groundHeight - truck.mesh.position.y) * SUSPENSION_STRENGTH
    - truck.verticalVelocity * SUSPENSION_DAMPING
  ) * delta
  truck.mesh.position.y += truck.verticalVelocity * delta
  if (truck.mesh.position.y < 0) {
    truck.mesh.position.y = 0
    truck.verticalVelocity = Math.max(0, truck.verticalVelocity)
  }

  for (const wheel of truck.wheels) {
    if (wheel.steer) {
      wheel.pivot.rotation.y = turnDirection * STEER_ANGLE_MAX
    }
    wheel.wheelMesh.rotation.x -= (truck.speed * delta) / (WHEEL_RADIUS * MODEL_SCALE)
  }
}

export function applyTruckImpact(truck, direction, force) {
  truck.impactVelocity.addScaledVector(direction, force)
  truck.impactSpin += (Math.random() < 0.5 ? -1 : 1) * force * 0.09
  truck.verticalVelocity = Math.max(truck.verticalVelocity, force * 0.24)
}

function getWorldHalfExtents(truck) {
  const cos = Math.abs(Math.cos(truck.heading))
  const sin = Math.abs(Math.sin(truck.heading))
  return {
    x: truck.halfWidth * cos + truck.halfLength * sin,
    z: truck.halfWidth * sin + truck.halfLength * cos,
  }
}
