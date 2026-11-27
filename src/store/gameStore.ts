import { create } from 'zustand'
import type { DailyGoal, PlayerProfile, PlayerResources, TranslationCode } from '../types/player'
import { STARTING_RESOURCES } from '../engine/rewards/economy'
import type { PlayerScripture } from '../types/scripture'
import type { GameSession } from '../types/games'
import { applyGameResult, type LearningUpdate } from '../engine/memorisation/learningEngine'
import { calculateGameRewards, type RewardSkipReason } from '../engine/rewards/rewardCalculator'
import { applyTransactions } from '../engine/rewards/economy'
import type { RewardTransaction } from '../types/rewards'
import {
  loadGame,
  loadScriptureProgress,
  resetAllProgress,
  loadGameSession,
  loadRewardTransactions,
  saveCompletedGame,
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
  /** Every reward ever granted (used for duplicate checks and daily caps). */
  rewardTransactions: RewardTransaction[]
  /** The game just finished and what it changed, shown on the completion screen. */
  lastGame: CompletedGame | null

  /** Loads saved progress from the device. Call once at startup. */
  hydrate: () => Promise<void>
  /** Creates and saves a guest player (onboarding). */
  createGuestPlayer: (input: NewPlayerInput) => Promise<void>
  /** Renames the player. */
  updateDisplayName: (displayName: string) => Promise<void>
  /**
   * Applies a finished game to the scripture's progress (learning engine) and
   * saves both. Safe to call twice with the same session: it is only applied once.
   */
  completeGame: (session: GameSession) => Promise<CompletedGame>
  /** Wipes all progress on this device. */
  resetProgress: () => Promise<void>
}

export interface CompletedGame {
  session: GameSession
  progressBefore: PlayerScripture | undefined
  update: LearningUpdate
  rewards: RewardTransaction[]
  rewardSkipped: RewardSkipReason | null
  levelBefore: number
  levelAfter: number
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
  rewardTransactions: [],
  lastGame: null,

  hydrate: async () => {
    set({ status: 'loading', errorMessage: null })
    try {
      const [saved, scriptureProgress, rewardTransactions] = await Promise.all([
        loadGame(),
        loadScriptureProgress(),
        loadRewardTransactions(),
      ])
      if (saved) {
        useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, ...saved.settings } })
        set({ status: 'ready', profile: saved.profile, resources: saved.resources, scriptureProgress, rewardTransactions })
      } else {
        useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
        set({ status: 'ready', profile: null, resources: null, scriptureProgress: {}, rewardTransactions: [] })
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
    set({ profile, resources, scriptureProgress: {}, rewardTransactions: [] })
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

  completeGame: async (session) => {
    const last = get().lastGame
    if (last?.session.id === session.id) return last
    if (await loadGameSession(session.id)) throw new Error('This game has already been saved.')

    const resourcesBefore = get().resources
    if (!resourcesBefore) throw new Error('No player profile.')
    const progressBefore = get().scriptureProgress[session.scriptureId]
    const update = applyGameResult(progressBefore, {
      scriptureId: session.scriptureId,
      gameType: session.gameType,
      accuracy: session.accuracy,
      completedAt: new Date(session.completedAt),
    })

    // Rewards come only from the central reward engine.
    const allTransactions = get().rewardTransactions
    const { transactions, skipped } = calculateGameRewards({
      session,
      update,
      existingTransactionIds: new Set(allTransactions.map((t) => t.id)),
      allTransactions,
    })
    const resources = applyTransactions(resourcesBefore, transactions, new Date(session.completedAt))
    const savedSession = { ...session, rewardsGranted: true }

    await saveCompletedGame({ session: savedSession, progress: update.progress, transactions, resources })
    const completed: CompletedGame = {
      session: savedSession,
      progressBefore,
      update,
      rewards: transactions,
      rewardSkipped: skipped,
      levelBefore: resourcesBefore.level,
      levelAfter: resources.level,
    }
    set({
      scriptureProgress: { ...get().scriptureProgress, [session.scriptureId]: update.progress },
      rewardTransactions: [...allTransactions, ...transactions],
      resources,
      lastGame: completed,
    })
    return completed
  },

  resetProgress: async () => {
    await resetAllProgress()
    useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
    set({ profile: null, resources: null, scriptureProgress: {}, rewardTransactions: [], lastGame: null })
  },
}))
