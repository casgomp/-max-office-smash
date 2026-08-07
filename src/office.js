import * as THREE from 'three'
import { ROOM_SIZE, WALL_THICKNESS } from './scene.js'
import { createDestructible } from './destructible.js'

const WALL_MARGIN = 1
const INNER_BOUND = ROOM_SIZE / 2 - WALL_THICKNESS / 2 - WALL_MARGIN
const SPAWN_CLEAR_RADIUS = 4
const MAX_PLACEMENT_ATTEMPTS = 30

const OBJECT_TYPES = [
  {
    name: 'desk',
    pointValue: 50,
    count: 6,
    footprint: 1.4,
    color: 0x8a5a34,
    createGeometry: () => new THREE.BoxGeometry(2.2, 0.75, 1.1),
  },
  {
    name: 'monitor',
    pointValue: 20,
    count: 6,
    footprint: 0.5,
    color: 0x222222,
    createGeometry: () => new THREE.BoxGeometry(0.6, 0.5, 0.15),
  },
  {
    name: 'chair',
    pointValue: 30,
    count: 6,
    footprint: 0.6,
    color: 0x35704f,
    createGeometry: () => new THREE.CylinderGeometry(0.35, 0.4, 0.9, 12),
  },
  {
    name: 'printer',
    pointValue: 40,
    count: 4,
    footprint: 0.8,
    color: 0xcfcfcf,
    createGeometry: () => new THREE.BoxGeometry(0.9, 0.7, 0.7),
  },
]

export function clearOfficeObjects(scene, destructibles) {
  for (const destructible of destructibles) {
    if (!destructible.destroyed) {
      scene.remove(destructible.mesh)
    }
  }
}

export function createOfficeObjects(scene) {
  const destructibles = []
  const placed = []

  for (const type of OBJECT_TYPES) {
    const material = new THREE.MeshStandardMaterial({ color: type.color })

    for (let i = 0; i < type.count; i++) {
      const geometry = type.createGeometry()
      geometry.computeBoundingBox()
      const height = geometry.boundingBox.max.y - geometry.boundingBox.min.y

      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true

      const { x, z } = findScatterPosition(placed, type.footprint)
      mesh.position.set(x, height / 2, z)
      mesh.rotation.y = Math.random() * Math.PI * 2

      placed.push({ x, z, footprint: type.footprint })
      scene.add(mesh)

      destructibles.push(createDestructible(mesh, type.pointValue))
    }
  }

  return destructibles
}

function findScatterPosition(placed, footprint) {
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
    const x = THREE.MathUtils.randFloatSpread(INNER_BOUND * 2)
    const z = THREE.MathUtils.randFloatSpread(INNER_BOUND * 2)

    if (Math.hypot(x, z) < SPAWN_CLEAR_RADIUS) continue

    const collides = placed.some(
      (other) => Math.hypot(other.x - x, other.z - z) < other.footprint + footprint + 0.3,
    )
    if (!collides) return { x, z }
  }

  return {
    x: THREE.MathUtils.randFloatSpread(INNER_BOUND * 2),
    z: THREE.MathUtils.randFloatSpread(INNER_BOUND * 2),
  }
}
