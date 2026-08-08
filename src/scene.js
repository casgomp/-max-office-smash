import * as THREE from 'three'

export const ROOM_SIZE = 144
export const WALL_THICKNESS = 0.5
export const FARM_BUMPS = [
  { x: -18, z: 8, radius: 4.5, height: 1.25 },
  { x: 16, z: -12, radius: 3.8, height: 1.05 },
  { x: 38, z: 18, radius: 5, height: 1.4 },
  { x: -42, z: -22, radius: 4.2, height: 1.15 },
  { x: 5, z: 38, radius: 4.8, height: 1.3 },
  { x: -30, z: 42, radius: 3.6, height: 0.95 },
  { x: 48, z: -38, radius: 4.5, height: 1.2 },
  { x: -55, z: 12, radius: 4, height: 1.1 },
  { x: 28, z: 58, radius: 3.6, height: 1.05 },
  { x: -58, z: -52, radius: 4.8, height: 1.35 },
  { x: 57, z: -6, radius: 4.2, height: 1.2 },
  { x: -22, z: -57, radius: 3.9, height: 0.95 },
]
const FARM_RIDGES = [
  { x: 0, z: -30, width: 3, length: 13, height: 0.8, rotation: Math.PI / 5 },
  { x: 30, z: -4, width: 2.5, length: 16, height: 0.65, rotation: -Math.PI / 3 },
  { x: -32, z: 18, width: 3.5, length: 12, height: 0.9, rotation: Math.PI / 2.5 },
  { x: 45, z: 55, width: 3, length: 14, height: 0.75, rotation: Math.PI / 3 },
  { x: -50, z: 57, width: 2.8, length: 11, height: 0.7, rotation: -Math.PI / 5 },
]
const FARM_PYRAMIDS = [
  { x: 20, z: 42, radius: 4.5, height: 1.5, rotation: Math.PI / 4 },
  { x: -48, z: -45, radius: 3.8, height: 1.2, rotation: 0 },
  { x: 50, z: 35, radius: 5, height: 1.65, rotation: Math.PI / 4 },
]
const FENCE_HEIGHT = 2.2

export function createScene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87c9f4)
  scene.fog = new THREE.Fog(0x87c9f4, 145, 280)

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500,
  )

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  document.querySelector('#app').appendChild(renderer.domElement)

  addLights(scene)
  const projectileBlockers = addFarm(scene)

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  return { scene, camera, renderer, projectileBlockers }
}

function addLights(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambient)

  const sun = new THREE.DirectionalLight(0xffffff, 1.2)
  sun.position.set(15, 25, 10)
  sun.castShadow = true
  sun.shadow.camera.left = -ROOM_SIZE / 2
  sun.shadow.camera.right = ROOM_SIZE / 2
  sun.shadow.camera.top = ROOM_SIZE / 2
  sun.shadow.camera.bottom = -ROOM_SIZE / 2
  sun.shadow.mapSize.set(2048, 2048)
  scene.add(sun)
}

function addFarm(scene) {
  const projectileBlockers = []
  const outerGround = new THREE.Mesh(
    new THREE.BoxGeometry(320, 0.4, 320),
    new THREE.MeshStandardMaterial({ color: 0x315d32, roughness: 1 }),
  )
  outerGround.position.y = -0.45
  outerGround.receiveShadow = true
  scene.add(outerGround)

  const floorGeometry = new THREE.BoxGeometry(ROOM_SIZE, 0.5, ROOM_SIZE)
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x5f9f45, roughness: 1 })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.position.y = -0.25
  floor.receiveShadow = true
  scene.add(floor)

  addFence(scene)
  addBarn(scene, projectileBlockers)
  addSilo(scene, projectileBlockers)
  addCropRows(scene)
  addBumps(scene)
  addForest(scene, projectileBlockers)
  return projectileBlockers
}

export function getFarmBumpHeight(x, z) {
  let height = 0
  for (const bump of FARM_BUMPS) {
    const distance = Math.hypot(x - bump.x, z - bump.z)
    if (distance >= bump.radius) continue
    height = Math.max(height, bump.height * (1 - distance / bump.radius))
  }
  for (const ridge of FARM_RIDGES) {
    const local = toLocalPosition(x, z, ridge)
    if (Math.abs(local.z) > ridge.length / 2 || Math.abs(local.x) > ridge.width / 2) continue
    const crossSection = 1 - Math.abs(local.x) / (ridge.width / 2)
    const roundedEnds = Math.min(1, (ridge.length / 2 - Math.abs(local.z)) * 2)
    height = Math.max(height, ridge.height * crossSection * roundedEnds)
  }
  for (const pyramid of FARM_PYRAMIDS) {
    const local = toLocalPosition(x, z, pyramid)
    const distance = Math.max(Math.abs(local.x), Math.abs(local.z))
    if (distance >= pyramid.radius) continue
    height = Math.max(height, pyramid.height * (1 - distance / pyramid.radius))
  }
  return height
}

function addBumps(scene) {
  const dirt = new THREE.MeshStandardMaterial({ color: 0x795238, roughness: 1 })
  for (const bump of FARM_BUMPS) {
    const mound = new THREE.Mesh(
      new THREE.ConeGeometry(bump.radius, bump.height, 28),
      dirt,
    )
    mound.position.set(bump.x, bump.height / 2, bump.z)
    mound.receiveShadow = true
    mound.castShadow = true
    scene.add(mound)
  }

  const ridgeMaterial = new THREE.MeshStandardMaterial({ color: 0x68452f, roughness: 1 })
  for (const ridge of FARM_RIDGES) {
    const mound = new THREE.Mesh(
      new THREE.BoxGeometry(ridge.width, ridge.height, ridge.length),
      ridgeMaterial,
    )
    mound.position.set(ridge.x, ridge.height / 2 - 0.12, ridge.z)
    mound.rotation.y = ridge.rotation
    mound.receiveShadow = true
    mound.castShadow = true
    scene.add(mound)
  }

  const pyramidMaterial = new THREE.MeshStandardMaterial({ color: 0x8a6040, roughness: 1 })
  for (const pyramid of FARM_PYRAMIDS) {
    const mound = new THREE.Mesh(
      new THREE.ConeGeometry(pyramid.radius, pyramid.height, 4),
      pyramidMaterial,
    )
    mound.position.set(pyramid.x, pyramid.height / 2, pyramid.z)
    mound.rotation.y = pyramid.rotation
    mound.receiveShadow = true
    mound.castShadow = true
    scene.add(mound)
  }
}

function toLocalPosition(x, z, feature) {
  const dx = x - feature.x
  const dz = z - feature.z
  const cos = Math.cos(feature.rotation)
  const sin = Math.sin(feature.rotation)
  return {
    x: dx * cos - dz * sin,
    z: dx * sin + dz * cos,
  }
}

function addFence(scene) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x77502e, roughness: 0.9 })
  const half = ROOM_SIZE / 2
  const postGeometry = new THREE.BoxGeometry(0.35, FENCE_HEIGHT, 0.35)
  const railGeometry = new THREE.BoxGeometry(4.1, 0.22, 0.22)

  for (let offset = -half; offset <= half; offset += 4) {
    for (const side of [-1, 1]) {
      const postZ = new THREE.Mesh(postGeometry, wood)
      postZ.position.set(offset, FENCE_HEIGHT / 2, side * half)
      postZ.castShadow = true
      scene.add(postZ)

      const postX = postZ.clone()
      postX.position.set(side * half, FENCE_HEIGHT / 2, offset)
      scene.add(postX)
    }
  }

  for (let offset = -half + 2; offset < half; offset += 4) {
    for (const y of [0.75, 1.55]) {
      for (const side of [-1, 1]) {
        const zRail = new THREE.Mesh(railGeometry, wood)
        zRail.position.set(offset, y, side * half)
        zRail.castShadow = true
        scene.add(zRail)

        const xRail = zRail.clone()
        xRail.rotation.y = Math.PI / 2
        xRail.position.set(side * half, y, offset)
        scene.add(xRail)
      }
    }
  }
}

function addBarn(scene, projectileBlockers) {
  const group = new THREE.Group()
  const red = new THREE.MeshStandardMaterial({ color: 0xa8322d, roughness: 0.9 })
  const white = new THREE.MeshStandardMaterial({ color: 0xf2eadb })
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x473a35, roughness: 1 })
  const base = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 5), red)
  base.position.y = 2.5
  base.castShadow = true
  group.add(base)

  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.1, 3, 4), roofMaterial)
  roof.rotation.y = Math.PI / 4
  roof.scale.z = 0.72
  roof.position.y = 6.1
  roof.castShadow = true
  group.add(roof)

  const door = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.7, 0.12), white)
  door.position.set(0, 1.85, 2.56)
  group.add(door)
  group.position.set(-55, 0, -65)
  scene.add(group)
  projectileBlockers.push({ x: -55, z: -65, radius: 5, kind: 'barn' })
}

function addSilo(scene, projectileBlockers) {
  const metal = new THREE.MeshStandardMaterial({ color: 0xaeb7bd, metalness: 0.35, roughness: 0.7 })
  const silo = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 7, 20), metal)
  body.position.y = 3.5
  body.castShadow = true
  silo.add(body)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.35, 2, 20), metal)
  roof.position.y = 8
  roof.castShadow = true
  silo.add(roof)
  silo.position.set(55, 0, -65)
  scene.add(silo)
  projectileBlockers.push({ x: 55, z: -65, radius: 2.5, kind: 'silo' })
}

function addCropRows(scene) {
  const soil = new THREE.MeshStandardMaterial({ color: 0x70452b, roughness: 1 })
  for (let x = -42; x <= 42; x += 3) {
    const row = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 14), soil)
    row.position.set(x, 0.05, 62)
    row.receiveShadow = true
    scene.add(row)
  }
}

function addForest(scene, projectileBlockers) {
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5e3b24, roughness: 1 })
  const leafMaterials = [0x245b2a, 0x2f6f35, 0x397d3d].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 1 }),
  )
  const trunkGeometry = new THREE.CylinderGeometry(0.35, 0.5, 4, 8)
  const crownGeometry = new THREE.ConeGeometry(2.2, 5.5, 9)
  const forestInner = ROOM_SIZE / 2 + 4
  const forestOuter = 135

  for (let i = 0; i < 300; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.sqrt(
      THREE.MathUtils.lerp(forestInner * forestInner, forestOuter * forestOuter, Math.random()),
    )
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const scale = THREE.MathUtils.randFloat(0.8, 1.45)
    const tree = new THREE.Group()

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
    trunk.position.y = 2
    trunk.castShadow = true
    tree.add(trunk)

    const crown = new THREE.Mesh(
      crownGeometry,
      leafMaterials[Math.floor(Math.random() * leafMaterials.length)],
    )
    crown.position.y = 5.8
    crown.castShadow = true
    tree.add(crown)

    tree.position.set(x, 0, z)
    tree.scale.setScalar(scale)
    tree.rotation.y = Math.random() * Math.PI * 2
    scene.add(tree)
    projectileBlockers.push({ x, z, radius: 0.6 * scale })
  }
}
