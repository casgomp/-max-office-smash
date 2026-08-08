import * as THREE from 'three'
import { ROOM_SIZE, WALL_THICKNESS } from './scene.js'
import { createDestructible } from './destructible.js'

const INNER_BOUND = ROOM_SIZE / 2 - WALL_THICKNESS - 1.5
const SPAWN_CLEAR_RADIUS = 5
const MAX_PLACEMENT_ATTEMPTS = 40

const ANIMAL_TYPES = [
  { name: 'cow', pointValue: 80, count: 5, footprint: 1.25, create: createCow },
  { name: 'pig', pointValue: 50, count: 5, footprint: 0.85, create: createPig },
  { name: 'sheep', pointValue: 60, count: 5, footprint: 0.9, create: createSheep },
  { name: 'chicken', pointValue: 30, count: 7, footprint: 0.45, create: createChicken },
]

export function createFarmObjects(scene) {
  const animals = []
  const placed = []

  for (const type of ANIMAL_TYPES) {
    for (let i = 0; i < type.count; i++) {
      const animal = type.create()
      const { x, z } = findScatterPosition(placed, type.footprint)
      animal.position.set(x, 0, z)
      animal.rotation.y = Math.random() * Math.PI * 2
      animal.userData.animalType = type.name

      placed.push({ x, z, footprint: type.footprint })
      scene.add(animal)
      animals.push(createDestructible(animal, type.pointValue))
    }
  }

  return animals
}

export function clearFarmObjects(scene, animals) {
  for (const animal of animals) {
    if (!animal.destroyed) scene.remove(animal.mesh)
  }
}

export function respawnFarmAnimal(scene, animals, destroyedAnimal) {
  const animalType = destroyedAnimal.mesh.userData.animalType
  const type = ANIMAL_TYPES.find((candidate) => candidate.name === animalType)
  if (!type) return

  const placed = animals
    .filter((animal) => animal !== destroyedAnimal && !animal.destroyed)
    .map((animal) => ({
      x: animal.mesh.position.x,
      z: animal.mesh.position.z,
      footprint: ANIMAL_TYPES.find(
        (candidate) => candidate.name === animal.mesh.userData.animalType,
      )?.footprint ?? 1,
    }))
  const { x, z } = findScatterPosition(placed, type.footprint)
  const animal = type.create()
  animal.position.set(x, 0, z)
  animal.rotation.y = Math.random() * Math.PI * 2
  animal.userData.animalType = type.name
  scene.add(animal)
  animals.push(createDestructible(animal, type.pointValue))
}

function createCow() {
  const group = new THREE.Group()
  const white = material(0xeee9dd)
  const black = material(0x242424)
  const pink = material(0xe6a6a6)
  addBody(group, [2.25, 1.25, 1.1], [0, 1.45, 0], white)
  addBody(group, [0.85, 0.9, 0.85], [0, 1.65, 1.25], white)
  addBody(group, [0.95, 0.38, 0.9], [0, 1.3, 1.48], pink)
  for (const spot of [
    [-0.75, 1.58, 0.25, 0.08, 0.4, 0.45],
    [0.7, 1.28, -0.2, 0.08, 0.34, 0.5],
    [-0.35, 1.8, -0.56, 0.38, 0.28, 0.08],
  ]) {
    const patch = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), black)
    patch.position.set(spot[0], spot[1], spot[2])
    patch.scale.set(spot[3], spot[4], spot[5])
    group.add(patch)
  }
  addLegs(group, 0.75, 0.4, 0.28, 0.95, black)
  addEyes(group, 1.7, 1.66, 0.43)
  addEars(group, 2.0, 0.58, black, 1.25)
  addHorns(group)
  addTail(group, [0, 1.55, -0.75], white, black, 1.1)
  return group
}

function createPig() {
  const group = new THREE.Group()
  const pink = material(0xe58f9c)
  const darkPink = material(0xb85f70)
  addEllipsoid(group, [1.35, 0.8, 0.85], [0, 0.95, 0], pink)
  addEllipsoid(group, [0.68, 0.62, 0.62], [0, 1.05, 0.88], pink)
  addBody(group, [0.55, 0.35, 0.28], [0, 0.94, 1.27], darkPink)
  addLegs(group, 0.52, 0.28, 0.18, 0.58, darkPink)
  addEyes(group, 1.22, 1.17, 0.27)
  addEars(group, 1.47, 0.48, pink, 0.82)
  addNostrils(group, 1.02, 1.43, 0.15)
  addCurlyTail(group)
  return group
}

function createSheep() {
  const group = new THREE.Group()
  const wool = material(0xf2f0df)
  const face = material(0x4a4038)
  addEllipsoid(group, [1.45, 0.95, 0.95], [0, 1.15, 0], wool)
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.34, 9, 7), wool)
    puff.position.set(
      Math.cos(angle) * 1.1,
      1.15 + Math.sin(i * 2.3) * 0.35,
      Math.sin(angle) * 0.62,
    )
    puff.castShadow = true
    group.add(puff)
  }
  addEllipsoid(group, [0.58, 0.66, 0.55], [0, 1.22, 0.98], face)
  addLegs(group, 0.52, 0.3, 0.2, 0.72, face)
  addEyes(group, 1.35, 1.23, 0.25)
  addEars(group, 1.52, 0.52, face, 0.9)
  addTail(group, [0, 1.25, -0.86], wool, wool, 0.45)
  return group
}

function createChicken() {
  const group = new THREE.Group()
  const feathers = material(0xf4eee0)
  const red = material(0xc9342f)
  const orange = material(0xe6a12a)
  addEllipsoid(group, [0.58, 0.68, 0.58], [0, 0.75, 0], feathers)
  addEllipsoid(group, [0.38, 0.4, 0.38], [0, 1.25, 0.28], feathers)
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 4), orange)
  beak.rotation.x = Math.PI / 2
  beak.position.set(0, 1.22, 0.65)
  group.add(beak)
  for (const x of [-0.15, 0, 0.15]) {
    const comb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), red)
    comb.position.set(x, 1.58, 0.22)
    group.add(comb)
  }
  addLegs(group, 0.18, 0.12, 0.07, 0.42, orange)
  addEyes(group, 1.38, 0.36, 0.18)
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), feathers)
    wing.scale.set(0.35, 0.8, 0.7)
    wing.position.set(side * 0.52, 0.82, 0)
    wing.rotation.z = side * 0.3
    wing.castShadow = true
    group.add(wing)

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.08), orange)
    foot.position.set(side * 0.18, 0.03, 0.18)
    group.add(foot)
  }
  for (let i = -1; i <= 1; i++) {
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.75, 5), feathers)
    tail.rotation.x = -0.7
    tail.rotation.z = i * 0.28
    tail.position.set(i * 0.18, 1.02, -0.48)
    group.add(tail)
  }
  return group
}

function material(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
}

function addBody(group, size, position, meshMaterial) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), meshMaterial)
  mesh.position.set(...position)
  mesh.castShadow = true
  group.add(mesh)
}

function addEllipsoid(group, scale, position, meshMaterial) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), meshMaterial)
  mesh.scale.set(...scale)
  mesh.position.set(...position)
  mesh.castShadow = true
  group.add(mesh)
}

function addLegs(group, x, z, width, height, meshMaterial) {
  const geometry = new THREE.BoxGeometry(width, height, width)
  for (const legX of [-x, x]) {
    for (const legZ of [-z, z]) {
      const leg = new THREE.Mesh(geometry, meshMaterial)
      leg.position.set(legX, height / 2, legZ)
      leg.castShadow = true
      group.add(leg)
    }
  }
}

function addEyes(group, y, z, x) {
  const eyeMaterial = material(0x111111)
  for (const eyeX of [-x, x]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), eyeMaterial)
    eye.position.set(eyeX, y, z)
    group.add(eye)
  }
}

function addEars(group, y, x, earMaterial, z = 0.86) {
  for (const earX of [-x, x]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 4), earMaterial)
    ear.position.set(earX, y, z)
    ear.rotation.z = earX < 0 ? -0.7 : 0.7
    group.add(ear)
  }
}

function addHorns(group) {
  const hornMaterial = material(0xe2d2a2)
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 8), hornMaterial)
    horn.position.set(side * 0.5, 2.08, 1.25)
    horn.rotation.z = side * -0.75
    group.add(horn)
  }
}

function addNostrils(group, y, z, x) {
  const nostrilMaterial = material(0x6e3440)
  for (const side of [-1, 1]) {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), nostrilMaterial)
    nostril.position.set(side * x, y, z)
    group.add(nostril)
  }
}

function addTail(group, position, tailMaterial, tipMaterial, length) {
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, length, 7), tailMaterial)
  tail.position.set(...position)
  tail.rotation.x = -0.35
  group.add(tail)
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), tipMaterial)
  tip.position.set(position[0], position[1] - length * 0.45, position[2] - length * 0.4)
  group.add(tip)
}

function addCurlyTail(group) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.05, -0.72),
    new THREE.Vector3(0.2, 1.18, -0.92),
    new THREE.Vector3(0.35, 1.02, -0.85),
    new THREE.Vector3(0.22, 0.95, -0.72),
  ])
  const tail = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 16, 0.045, 6, false),
    material(0xb85f70),
  )
  group.add(tail)
}

function findScatterPosition(placed, footprint) {
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
    const x = THREE.MathUtils.randFloatSpread(INNER_BOUND * 2)
    const z = THREE.MathUtils.randFloatSpread(INNER_BOUND * 2)
    if (Math.hypot(x, z) < SPAWN_CLEAR_RADIUS) continue
    const overlaps = placed.some(
      (other) => Math.hypot(other.x - x, other.z - z) < other.footprint + footprint + 0.45,
    )
    if (!overlaps) return { x, z }
  }
  return {
    x: THREE.MathUtils.randFloatSpread(INNER_BOUND * 2),
    z: THREE.MathUtils.randFloatSpread(INNER_BOUND * 2),
  }
}
