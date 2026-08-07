const KEY_MAP = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
}

export function createInput() {
  const state = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  }

  const handleKey = (event, isDown) => {
    const action = KEY_MAP[event.code]
    if (!action) return
    state[action] = isDown
  }

  window.addEventListener('keydown', (event) => handleKey(event, true))
  window.addEventListener('keyup', (event) => handleKey(event, false))

  return state
}
