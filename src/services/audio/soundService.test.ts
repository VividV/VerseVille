import { afterEach, describe, expect, it, vi } from 'vitest'
import { playSound } from './soundService'
import { DEFAULT_SETTINGS, useSettingsStore } from '../../store/settingsStore'

class FakeParam {
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
  value = 0
}
const created: string[] = []
class FakeContext {
  state = 'running'
  currentTime = 0
  destination = {}
  resume() {
    return Promise.resolve()
  }
  createOscillator() {
    created.push('osc')
    return { type: '', frequency: new FakeParam(), connect: (n: unknown) => n, start() {}, stop() {} }
  }
  createGain() {
    return { gain: new FakeParam(), connect: (n: unknown) => n }
  }
}

describe('sound effects', () => {
  afterEach(() => {
    created.length = 0
    vi.unstubAllGlobals()
  })

  it('plays when sound is on and stays silent when it is off', () => {
    vi.stubGlobal('AudioContext', FakeContext)
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, soundEnabled: false } })
    playSound('correct')
    expect(created).toHaveLength(0)
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, soundEnabled: true } })
    playSound('correct')
    expect(created).toHaveLength(2)
  })

  it('never throws when audio is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined)
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, soundEnabled: true } })
    expect(() => playSound('levelUp')).not.toThrow()
  })
})
