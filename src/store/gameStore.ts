import { create } from 'zustand'
import type { DailyGoal, PlayerProfile, PlayerResources, TranslationCode } from '../types/player'
import { STARTING_RESOURCES } from '../engine/rewards/economy'
import type { PlayerScripture } from '../types/scripture'
import {
  loadGame,
  loadScriptureProgress,
  resetAllProgress,
  saveNewGame,
  saveProfile,
} from '../services/persistence/saveService'
import { createId } from '../utils/idUtils'
import { nowIso } from '../utils/dateUtils'
import { DEFAULT_SETTINGS, useSettingsStore } from './settingsStore'

export type LoadStatus = 'loading' | 'ready' | 'error'

export interface NewPlayerInput {
  displayName: string
  preferredTranslation: TranslationCode
  dailyGoal: DailyGoal
}

interface GameState {
  status: LoadStatus
  errorMessage: string | null
  profile: PlayerProfile | null
  resources: PlayerResources | null
  /** Progress on each started scripture, keyed by scripture id. Empty until a scripture is learned. */
  scriptureProgress: Record<string, PlayerScripture>

  /** Loads saved progress from the device. Call once at startup. */
  hydrate: () => Promise<void>
  /** Creates and saves a guest player (onboarding). */
  createGuestPlayer: (input: NewPlayerInput) => Promise<void>
  /** Renames the player. */
  updateDisplayName: (displayName: string) => Promise<void>
  /** Wipes all progress on this device. */
  resetProgress: () => Promise<void>
}

export const MAX_NAME_LENGTH = 24

/** Trims and limits a display name. Returns '' if nothing usable is left. */
export function cleanDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH)
}

export const useGameStore = create<GameState>()((set, get) => ({
  status: 'loading',
  errorMessage: null,
  profile: null,
  resources: null,
  scriptureProgress: {},

  hydrate: async () => {
    set({ status: 'loading', errorMessage: null })
    try {
      const [saved, scriptureProgress] = await Promise.all([loadGame(), loadScriptureProgress()])
      if (saved) {
        useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, ...saved.settings } })
        set({ status: 'ready', profile: saved.profile, resources: saved.resources, scriptureProgress })
      } else {
        useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
        set({ status: 'ready', profile: null, resources: null, scriptureProgress: {} })
      }
    } catch (error) {
      set({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Could not load your progress.',
      })
    }
  },

  createGuestPlayer: async ({ displayName, preferredTranslation, dailyGoal }) => {
    const name = cleanDisplayName(displayName)
    if (!name) throw new Error('Please enter a display name.')
    const now = nowIso()
    const profile: PlayerProfile = { id: createId(), displayName: name, createdAt: now, updatedAt: now }
    const resources: PlayerResources = { ...STARTING_RESOURCES, updatedAt: now }
    const settings = { ...DEFAULT_SETTINGS, preferredTranslation, dailyGoal }
    await saveNewGame({ profile, resources, settings })
    useSettingsStore.setState({ settings })
    set({ profile, resources, scriptureProgress: {} })
  },

  updateDisplayName: async (displayName) => {
    const current = get().profile
    if (!current) return
    const name = cleanDisplayName(displayName)
    if (!name) throw new Error('Please enter a display name.')
    const profile = { ...current, displayName: name, updatedAt: nowIso() }
    await saveProfile(profile)
    set({ profile })
  },

  resetProgress: async () => {
    await resetAllProgress()
    useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
    set({ profile: null, resources: null, scriptureProgress: {} })
  },
}))
