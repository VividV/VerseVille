/**
 * Gentle sound effects, synthesised with the Web Audio API (no audio files).
 * Sounds play only when the player has "Sound effects" switched on.
 */
import { useSettingsStore } from '../../store/settingsStore'

export type SoundName = 'correct' | 'wrong' | 'complete' | 'reward' | 'levelUp' | 'place' | 'tap'

/** Notes as [frequency Hz, start offset s, duration s]. Soft, rounded, never harsh. */
const SOUNDS: Record<SoundName, { notes: [number, number, number][]; type: OscillatorType; volume: number }> = {
  tap: { notes: [[660, 0, 0.06]], type: 'sine', volume: 0.08 },
  correct: { notes: [[660, 0, 0.12], [880, 0.08, 0.16]], type: 'sine', volume: 0.12 },
  wrong: { notes: [[220, 0, 0.18]], type: 'triangle', volume: 0.08 },
  place: { notes: [[392, 0, 0.1], [523, 0.07, 0.14]], type: 'triangle', volume: 0.12 },
  complete: { notes: [[523, 0, 0.14], [659, 0.1, 0.14], [784, 0.2, 0.24]], type: 'sine', volume: 0.12 },
  reward: { notes: [[988, 0, 0.08], [1319, 0.06, 0.16]], type: 'sine', volume: 0.08 },
  levelUp: {
    notes: [[523, 0, 0.16], [659, 0.12, 0.16], [784, 0.24, 0.16], [1047, 0.36, 0.4]],
    type: 'sine',
    volume: 0.13,
  },
}

let context: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  context ??= new Ctor()
  return context
}

/** True if a sound would play now (setting on and audio available). */
export function soundEnabled(): boolean {
  return useSettingsStore.getState().settings.soundEnabled
}

export function playSound(name: SoundName): void {
  if (!soundEnabled()) return
  try {
    const ctx = getContext()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
    const { notes, type, volume } = SOUNDS[name]
    const start = ctx.currentTime + 0.01
    for (const [frequency, offset, duration] of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.value = frequency
      // Quick fade in and a soft fade out, so there are no clicks.
      gain.gain.setValueAtTime(0, start + offset)
      gain.gain.linearRampToValueAtTime(volume, start + offset + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start + offset)
      osc.stop(start + offset + duration + 0.05)
    }
  } catch {
    // Sound is a nice-to-have; never let it break the game.
  }
}
