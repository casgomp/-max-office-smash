export function createDestructible(mesh, pointValue) {
  return {
    mesh,
    pointValue,
    destroyed: false,
  }
}

export function destroy(destructible, scene) {
  if (destructible.destroyed) return
  destructible.destroyed = true
  scene.remove(destructible.mesh)
}
