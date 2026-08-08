import * as THREE from 'three'

export function createHealthBar(parent, y, width = 2.7) {
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 28
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    transparent: true,
  }))
  sprite.position.set(0, y, 0)
  sprite.scale.set(width, width * 0.176, 1)
  sprite.renderOrder = 10
  parent.add(sprite)

  const healthBar = { canvas, texture, sprite, lastHealth: null }
  updateHealthBar(healthBar, 100)
  return healthBar
}

export function updateHealthBar(healthBar, health) {
  const roundedHealth = Math.max(0, Math.min(100, Math.round(health)))
  if (healthBar.lastHealth === roundedHealth) return
  healthBar.lastHealth = roundedHealth

  const { canvas } = healthBar
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(15, 18, 22, 0.9)'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = roundedHealth > 60 ? '#43d65c' : roundedHealth > 30 ? '#f0c541' : '#e54242'
  context.fillRect(4, 4, (canvas.width - 8) * (roundedHealth / 100), canvas.height - 8)
  context.strokeStyle = '#ffffff'
  context.lineWidth = 2
  context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2)
  healthBar.texture.needsUpdate = true
}
