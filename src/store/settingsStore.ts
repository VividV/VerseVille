import { create } from 'zustand'
import type { PlayerSettings } from '../types/player'
import { saveSettings } from '../services/persistence/saveService'

export const DEFAULT_SETTINGS: PlayerSettings = {
  preferredTranslation: 'KJV',
  dailyGoal: 3,
  soundEnabled: true,
  notificationsEnabled: false,
  textSize: 'normal',
  highContrast: false,
  reducedMotion: false,
}

interface SettingsState {
  settings: PlayerSettings
  /** Changes one or more settings and saves them to the device. */
  updateSettings: (changes: Partial<PlayerSettings>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: DEFAULT_SETTINGS,
  updateSettings: async (changes) => {
    const next = { ...get().settings, ...changes }
    set({ settings: next })
    await saveSettings(next)
  },
}))
