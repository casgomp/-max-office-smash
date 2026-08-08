import * as THREE from 'three'
import { destroy } from './destructible.js'

const KNOCKBACK_SPEED = 9
const KNOCKBACK_UP_SPEED = 6
const GRAVITY = 18
const SPIN_SPEED = 6
const MAX_LIFETIME = 2.5
const FLOOR_REMOVE_Y = -5

const truckBox = new THREE.Box3()
const objectBox = new THREE.Box3()
const knockDirection = new THREE.Vector3()

export function createCollisionSystem(scene) {
  const flyingObjects = []
  const flyingSet = new Set()

  function checkCollisions(truck, destructibles, onScore) {
    truckBox.setFromObject(truck.mesh)

    for (const destructible of destructibles) {
      if (destructible.destroyed || flyingSet.has(destructible)) continue

      objectBox.setFromObject(destructible.mesh)
      if (!truckBox.intersectsBox(objectBox)) continue

      flyingSet.add(destructible)
      launchObject(destructible, truck)
      onScore(destructible.pointValue, destructible)
    }
  }

  function launchObject(destructible, truck) {
    knockDirection
      .subVectors(destructible.mesh.position, truck.mesh.position)
      .setY(0)

    if (knockDirection.lengthSq() < 1e-4) {
      knockDirection.set(Math.sin(truck.heading), 0, Math.cos(truck.heading))
    }
    knockDirection.normalize()

    flyingObjects.push({
      destructible,
      velocity: new THREE.Vector3(
        knockDirection.x * KNOCKBACK_SPEED,
        KNOCKBACK_UP_SPEED,
        knockDirection.z * KNOCKBACK_SPEED,
      ),
      spin: new THREE.Vector3(
        (Math.random() - 0.5) * SPIN_SPEED,
        (Math.random() - 0.5) * SPIN_SPEED,
        (Math.random() - 0.5) * SPIN_SPEED,
      ),
      elapsed: 0,
    })
  }

  function updateFlyingObjects(delta) {
    for (let i = flyingObjects.length - 1; i >= 0; i--) {
      const flying = flyingObjects[i]
      const mesh = flying.destructible.mesh

      flying.velocity.y -= GRAVITY * delta
      mesh.position.addScaledVector(flying.velocity, delta)
      mesh.rotation.x += flying.spin.x * delta
      mesh.rotation.y += flying.spin.y * delta
      mesh.rotation.z += flying.spin.z * delta
      flying.elapsed += delta

      if (mesh.position.y < FLOOR_REMOVE_Y || flying.elapsed > MAX_LIFETIME) {
        flyingSet.delete(flying.destructible)
        destroy(flying.destructible, scene)
        flyingObjects.splice(i, 1)
      }
    }
  }

  function reset() {
    flyingObjects.length = 0
    flyingSet.clear()
  }

  return { checkCollisions, updateFlyingObjects, reset }
}
