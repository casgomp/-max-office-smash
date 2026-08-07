import * as THREE from 'three'

export const ROOM_SIZE = 40
export const WALL_THICKNESS = 0.5
const WALL_HEIGHT = 8

export function createScene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xb8c4d0)

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
  addRoom(scene)

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  return { scene, camera, renderer }
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

function addRoom(scene) {
  const floorGeometry = new THREE.BoxGeometry(ROOM_SIZE, 0.5, ROOM_SIZE)
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x9a9a9a })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.position.y = -0.25
  floor.receiveShadow = true
  scene.add(floor)

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xd8d4c8 })
  const half = ROOM_SIZE / 2

  const wallConfigs = [
    { size: [ROOM_SIZE, WALL_HEIGHT, WALL_THICKNESS], position: [0, WALL_HEIGHT / 2, -half] },
    { size: [ROOM_SIZE, WALL_HEIGHT, WALL_THICKNESS], position: [0, WALL_HEIGHT / 2, half] },
    { size: [WALL_THICKNESS, WALL_HEIGHT, ROOM_SIZE], position: [-half, WALL_HEIGHT / 2, 0] },
    { size: [WALL_THICKNESS, WALL_HEIGHT, ROOM_SIZE], position: [half, WALL_HEIGHT / 2, 0] },
  ]

  for (const { size, position } of wallConfigs) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(...size), wallMaterial)
    wall.position.set(...position)
    wall.castShadow = true
    wall.receiveShadow = true
    scene.add(wall)
  }
}
