import * as THREE from 'three'

const PICKUP_RADIUS = 2
const HEAL_AMOUNT = 25
const PATCH_POSITIONS = [
  [-12, -20, 'carrot'],
  [22, 8, 'cabbage'],
  [-35, 34, 'corn'],
  [42, -28, 'carrot'],
  [8, 55, 'cabbage'],
  [-52, -8, 'corn'],
  [52, 42, 'carrot'],
  [-18, 48, 'cabbage'],
]

export function createVegetableSystem(scene) {
  const vegetables = []

  function spawn() {
    clear()
    for (const [x, z, type] of PATCH_POSITIONS) {
      const mesh = createVegetable(type)
      mesh.position.set(x, 0, z)
      mesh.rotation.y = Math.random() * Math.PI * 2
      scene.add(mesh)
      vegetables.push({ mesh, type })
    }
  }

  function update(playerTruck, onCollect) {
    const player = playerTruck.mesh.position
    for (let i = vegetables.length - 1; i >= 0; i--) {
      const vegetable = vegetables[i]
      const dx = vegetable.mesh.position.x - player.x
      const dz = vegetable.mesh.position.z - player.z
      if (dx * dx + dz * dz > PICKUP_RADIUS * PICKUP_RADIUS) continue
      if (!onCollect(HEAL_AMOUNT, vegetable.type)) continue
      scene.remove(vegetable.mesh)
      vegetables.splice(i, 1)
    }
  }

  function clear() {
    for (const vegetable of vegetables) scene.remove(vegetable.mesh)
    vegetables.length = 0
  }

  return { spawn, update, clear }
}

function createVegetable(type) {
  const group = new THREE.Group()
  if (type === 'carrot') createCarrots(group)
  if (type === 'cabbage') createCabbage(group)
  if (type === 'corn') createCorn(group)

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.08, 8, 28),
    new THREE.MeshStandardMaterial({
      color: 0x71ff5b,
      emissive: 0x2a9d28,
      emissiveIntensity: 0.8,
    }),
  )
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.12
  group.add(ring)
  return group
}

function createCarrots(group) {
  const orange = new THREE.MeshStandardMaterial({ color: 0xf28c28 })
  const green = new THREE.MeshStandardMaterial({ color: 0x2f8f3a })
  for (const x of [-0.45, 0, 0.45]) {
    const root = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 10), orange)
    root.position.set(x, 0.55, 0)
    root.rotation.z = Math.PI
    root.castShadow = true
    group.add(root)
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 6), green)
    leaves.position.set(x, 1.05, 0)
    group.add(leaves)
  }
}

function createCabbage(group) {
  const greens = [0x65a844, 0x7dbd55, 0x95ca68]
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 12, 8),
      new THREE.MeshStandardMaterial({ color: greens[i % greens.length] }),
    )
    const angle = (i / 6) * Math.PI * 2
    leaf.scale.set(0.8, 1, 0.55)
    leaf.position.set(Math.cos(angle) * 0.3, 0.55 + (i === 6 ? 0.2 : 0), Math.sin(angle) * 0.3)
    leaf.castShadow = true
    group.add(leaf)
  }
}

function createCorn(group) {
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf2c94c })
  const green = new THREE.MeshStandardMaterial({ color: 0x3e8f45 })
  for (const x of [-0.38, 0.38]) {
    const cob = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.1, 12), yellow)
    cob.position.set(x, 0.75, 0)
    cob.castShadow = true
    group.add(cob)
    for (const side of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.9, 5), green)
      leaf.position.set(x + side * 0.18, 0.55, 0)
      leaf.rotation.z = side * 0.35
      group.add(leaf)
    }
  }
}
