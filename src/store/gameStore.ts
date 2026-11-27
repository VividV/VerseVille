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
  loadDays,
  loadQuests,
  loadGarden,
  saveGarden,
  loadRewardTransactions,
  saveCompletedGame,
  saveNewGame,
  saveProfile,
} from '../services/persistence/saveService'
import { createId } from '../utils/idUtils'
import { nowIso } from '../utils/dateUtils'
import { DEFAULT_SETTINGS, useSettingsStore } from './settingsStore'
import { useGardenStore } from './gardenStore'
import { createStartingGarden } from '../engine/garden/startingGarden'
import { buildQuestsFor, questsForDate, useQuestStore } from './questStore'
import {
  applyQuestEvents,
  dailyGoalTransaction,
  emptyDay,
  questDateForSession,
  questEventsFrom,
  recordStudy,
} from '../engine/quests/questEngine'
import { REWARD_CONFIG } from '../engine/rewards/rewardCalculator'
import type { DailyQuest, DayRecord } from '../types/quests'
import { toLocalDateKey } from '../utils/dateUtils'
import { track } from '../services/analytics/analytics'

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
  /** Quests that this game completed. */
  questsCompleted: DailyQuest[]
  /** The day's record after this game (daily goal progress). */
  day: DayRecord
  dailyGoalJustCompleted: boolean
}

/** Learning analytics for a finished game (ids and numbers only). */
function trackGame(game: CompletedGame) {
  const { session, update } = game
  const base = { scriptureId: session.scriptureId }
  void track('game_completed', { ...base, gameType: session.gameType, accuracy: session.accuracy, durationSeconds: session.durationSeconds })
  if (session.gameType === 'recall') void track('recall_accuracy', { ...base, accuracy: session.accuracy })
  if (update.events.scriptureStarted) void track('scripture_started', base)
  if (update.events.scriptureLearned) void track('scripture_learned', base)
  if (update.events.reviewCompleted) void track('review_completed', { ...base, accuracy: session.accuracy })
  if (update.events.scriptureMastered) void track('scripture_mastered', base)
  if (game.dailyGoalJustCompleted) void track('daily_goal_completed', { goal: useSettingsStore.getState().settings.dailyGoal })
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
      const [saved, scriptureProgress, rewardTransactions, loadedGarden, quests, days] = await Promise.all([
        loadGame(),
        loadScriptureProgress(),
        loadRewardTransactions(),
        loadGarden(),
        loadQuests(),
        loadDays(),
      ])
      useQuestStore.setState({ quests, days })
      if (saved) {
        // Players from before the garden existed get the starting garden now.
        let garden = loadedGarden
        if (!garden) {
          garden = { items: createStartingGarden(new Date()), inventory: {}, meta: { expansionsUnlocked: 0 } }
          await saveGarden(garden)
        }
        useGardenStore.setState({ items: garden.items, inventory: garden.inventory, expansionsUnlocked: garden.meta.expansionsUnlocked })
        useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, ...saved.settings } })
        set({ status: 'ready', profile: saved.profile, resources: saved.resources, scriptureProgress, rewardTransactions })
        await useQuestStore.getState().ensureQuestsFor(toLocalDateKey(new Date()))
      } else {
        useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
        useGardenStore.setState({ items: [], inventory: {}, expansionsUnlocked: 0 })
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
    const garden = { items: createStartingGarden(new Date(now)), inventory: {}, meta: { expansionsUnlocked: 0 } }
    await saveNewGame({ profile, resources, settings }, garden)
    useSettingsStore.setState({ settings })
    useGardenStore.setState({ items: garden.items, inventory: {}, expansionsUnlocked: 0 })
    useQuestStore.setState({ quests: [], days: {} })
    set({ profile, resources, scriptureProgress: {}, rewardTransactions: [] })
    await useQuestStore.getState().ensureQuestsFor(toLocalDateKey(new Date()))
    void track('onboarding_completed', { dailyGoal, translation: preferredTranslation })
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

    // Daily goal and quests count towards the day the game was started.
    const completedAt = new Date(session.completedAt)
    const questDate = questDateForSession(completedAt, session.durationSeconds)
    const { days, quests: allQuests } = useQuestStore.getState()
    const dailyGoal = useSettingsStore.getState().settings.dailyGoal
    const study = recordStudy(
      days[questDate] ?? emptyDay(questDate),
      session.scriptureId,
      session.accuracy >= REWARD_CONFIG.minAccuracyForReward,
      dailyGoal,
      completedAt,
    )
    const dayQuests = questsForDate(allQuests, questDate)
    const questApplied = applyQuestEvents(
      dayQuests.length > 0 ? dayQuests : buildQuestsFor(questDate),
      questEventsFrom(update.events, study.goalJustCompleted),
      completedAt,
    )

    // Rewards come only from the central reward engine.
    const allTransactions = get().rewardTransactions
    const existingIds = new Set(allTransactions.map((t) => t.id))
    const { transactions, skipped } = calculateGameRewards({
      session,
      update,
      existingTransactionIds: existingIds,
      allTransactions,
    })
    const goalTx = dailyGoalTransaction(questDate, completedAt)
    if (study.goalJustCompleted && !existingIds.has(goalTx.id)) transactions.push(goalTx)
    const resources = applyTransactions(resourcesBefore, transactions, completedAt)
    const savedSession = { ...session, rewardsGranted: true }

    await saveCompletedGame({
      session: savedSession,
      progress: update.progress,
      transactions,
      resources,
      quests: questApplied.quests,
      day: study.day,
    })
    const completed: CompletedGame = {
      session: savedSession,
      progressBefore,
      update,
      rewards: transactions,
      rewardSkipped: skipped,
      levelBefore: resourcesBefore.level,
      levelAfter: resources.level,
      questsCompleted: questApplied.newlyCompleted,
      day: study.day,
      dailyGoalJustCompleted: study.goalJustCompleted,
    }
    useQuestStore.setState({
      quests: [...useQuestStore.getState().quests.filter((q) => q.questDate !== questDate), ...questApplied.quests],
      days: { ...useQuestStore.getState().days, [questDate]: study.day },
    })
    set({
      scriptureProgress: { ...get().scriptureProgress, [session.scriptureId]: update.progress },
      rewardTransactions: [...allTransactions, ...transactions],
      resources,
      lastGame: completed,
    })
    trackGame(completed)
    return completed
  },

  resetProgress: async () => {
    await resetAllProgress()
    useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
    useGardenStore.setState({ items: [], inventory: {}, expansionsUnlocked: 0 })
    useQuestStore.setState({ quests: [], days: {} })
    set({ profile: null, resources: null, scriptureProgress: {}, rewardTransactions: [], lastGame: null })
  },
}))
