let audioContext
let soundsEnabled = true

export function enableGameEndSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return
  if (!audioContext) audioContext = new AudioContext()
  if (audioContext.state === 'suspended') audioContext.resume()
}

export function setGameEndSoundEnabled(enabled) {
  soundsEnabled = enabled
}

export function playGameEndSound(reason) {
  if (!soundsEnabled || !audioContext || audioContext.state !== 'running') return
  const start = audioContext.currentTime
  const notes = reason === 'destroyed' ? [180, 135, 90] : [420, 330, 245, 180]
  const wave = reason === 'destroyed' ? 'sawtooth' : 'triangle'

  notes.forEach((frequency, index) => {
    const noteStart = start + index * 0.18
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = wave
    oscillator.frequency.setValueAtTime(frequency, noteStart)
    gain.gain.setValueAtTime(0.0001, noteStart)
    gain.gain.exponentialRampToValueAtTime(0.09, noteStart + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.32)
    oscillator.connect(gain).connect(audioContext.destination)
    oscillator.start(noteStart)
    oscillator.stop(noteStart + 0.34)
  })
}
