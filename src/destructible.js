export function createDestructible(mesh, pointValue, options = {}) {
  return {
    mesh,
    pointValue,
    destroyed: false,
    recoverable: options.recoverable ?? false,
  }
}

export function destroy(destructible, scene) {
  if (destructible.destroyed) return
  destructible.destroyed = true
  scene.remove(destructible.mesh)
}
