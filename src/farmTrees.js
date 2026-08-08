import * as THREE from 'three'
import { createDestructible } from './destructible.js'

const TREE_POSITIONS = [
  [-16, -35], [18, -42], [-38, -5], [42, 4], [-50, 25], [48, -22],
  [-8, 48], [18, 52], [-42, 45], [54, 48], [-58, -32], [34, 38],
]

export function createFarmTrees(scene, projectileBlockers) {
  const trees = []
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5b3822, roughness: 1 })
  const leafMaterials = [0x2f7036, 0x3d833f, 0x286331].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 1 }),
  )

  for (let i = 0; i < TREE_POSITIONS.length; i++) {
    const [x, z] = TREE_POSITIONS[i]
    const scale = THREE.MathUtils.randFloat(0.85, 1.2)
    const tree = new THREE.Group()
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, 4.2, 9), trunkMaterial)
    trunk.position.y = 2.1
    trunk.castShadow = true
    tree.add(trunk)
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(2.25, 5.4, 10),
      leafMaterials[i % leafMaterials.length],
    )
    crown.position.y = 5.7
    crown.castShadow = true
    tree.add(crown)
    tree.position.set(x, 0, z)
    tree.scale.setScalar(scale)
    scene.add(tree)

    const blocker = { x, z, radius: 0.75 * scale, active: true }
    projectileBlockers.push(blocker)
    const destructible = createDestructible(tree, 25)
    destructible.projectileBlocker = blocker
    trees.push(destructible)
  }
  return trees
}

export function clearFarmTrees(scene, trees) {
  for (const tree of trees) {
    scene.remove(tree.mesh)
    if (tree.projectileBlocker) tree.projectileBlocker.active = false
  }
}
