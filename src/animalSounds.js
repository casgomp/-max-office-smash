const SOUND_PROFILES = {
  cow: { src: '/audio/cow.ogg' },
  pig: { src: '/audio/pig.ogg' },
  sheep: { src: '/audio/sheep.ogg' },
  chicken: { src: '/audio/chicken.ogg', clipLength: 650 },
}

const preloadedSounds = new Map()
const lastPlayed = new Map()

export function enableAnimalSounds() {
  for (const [type, profile] of Object.entries(SOUND_PROFILES)) {
    if (preloadedSounds.has(type)) continue
    const audio = new Audio(profile.src)
    audio.preload = 'auto'
    audio.volume = 0.18
    audio.load()
    preloadedSounds.set(type, audio)
  }
}

export function playAnimalHitSound(type) {
  const profile = SOUND_PROFILES[type]
  if (!profile) return
  const now = performance.now()
  if (now - (lastPlayed.get(type) ?? -Infinity) < 1800) return
  lastPlayed.set(type, now)

  playRecording(profile)
}

function playRecording(profile) {
  const audio = new Audio(profile.src)
  audio.volume = 0.18
  audio.play().catch(() => {})
  if (profile.clipLength) {
    window.setTimeout(() => {
      audio.pause()
      audio.currentTime = 0
    }, profile.clipLength)
  }
}
