const IMPACT_SOUNDS = {
  truck: { src: '/audio/impact-metal.ogg', volume: 0.44, clipLength: 850, cooldown: 300 },
  bullet: { src: '/audio/impact-metal.ogg', volume: 0.4, clipLength: 480, cooldown: 100 },
  metal: { src: '/audio/impact-metal.ogg', volume: 0.28, clipLength: 750, cooldown: 260 },
  tree: { src: '/audio/impact-wood.ogg', volume: 0.24, clipLength: 650, cooldown: 350 },
  fence: { src: '/audio/impact-wood.ogg', volume: 0.18, clipLength: 420, cooldown: 500 },
  object: { src: '/audio/impact-thud.ogg', volume: 0.2, cooldown: 180 },
}

const lastPlayed = new Map()

export function enableImpactSounds() {
  for (const profile of Object.values(IMPACT_SOUNDS)) {
    const audio = new Audio(profile.src)
    audio.preload = 'auto'
    audio.load()
  }
}

export function playImpactSound(type) {
  const profile = IMPACT_SOUNDS[type] ?? IMPACT_SOUNDS.object
  const now = performance.now()
  if (now - (lastPlayed.get(type) ?? -Infinity) < profile.cooldown) return
  lastPlayed.set(type, now)

  playAudio(profile)
  if (type === 'truck') {
    playAudio({ src: '/audio/impact-thud.ogg', volume: 0.4 })
  } else if (type === 'bullet') {
    playAudio({ src: '/audio/impact-thud.ogg', volume: 0.26 })
  }
}

function playAudio(profile) {
  const audio = new Audio(profile.src)
  audio.volume = profile.volume
  audio.play().catch(() => {})
  if (profile.clipLength) {
    window.setTimeout(() => {
      audio.pause()
      audio.currentTime = 0
    }, profile.clipLength)
  }
}
