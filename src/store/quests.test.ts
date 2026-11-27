import { describe, expect, it } from 'vitest'
import { useGameStore } from './gameStore'
import { useQuestStore } from './questStore'
import { useGardenStore } from './gardenStore'
import { DEFAULT_SETTINGS, useSettingsStore } from './settingsStore'
import { closeDatabase } from '../services/persistence/localDatabase'
import { createGameSession } from '../engine/games/gameSession'
import { toLocalDateKey } from '../utils/dateUtils'
import type { GameType } from '../types/games'

function forgetMemory() {
  useGameStore.setState({ status: 'loading', profile: null, resources: null, scriptureProgress: {}, rewardTransactions: [], lastGame: null })
  useGardenStore.setState({ items: [], inventory: {}, expansionsUnlocked: 0 })
  useQuestStore.setState({ quests: [], days: {} })
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
}

function play(scriptureId: string, gameType: GameType, accuracy = 1) {
  const now = new Date()
  return useGameStore.getState().completeGame(
    createGameSession({
      scriptureId,
      gameType,
      accuracy,
      details: { kind: 'assisted', totalItems: 1, correctFirstTry: 1, hintsUsed: 0, mistakes: 0 },
      startedAt: now,
      now,
    }),
  )
}

describe('quests and daily goal in the store', () => {
  it('creates today\'s quests for a new player', async () => {
    forgetMemory()
    await useGameStore.getState().createGuestPlayer({ displayName: 'Grace', preferredTranslation: 'KJV', dailyGoal: 1 })
    const today = toLocalDateKey(new Date())
    expect(useQuestStore.getState().quests.map((q) => q.id)).toEqual([
      `${today}:complete_daily_goal`,
      `${today}:recall_challenge`,
      `${today}:learn_one_scripture`,
    ])
  })

  it('progresses quests from real games, grants the daily goal seed, and lets each quest be claimed once', async () => {
    forgetMemory()
    await useGameStore.getState().createGuestPlayer({ displayName: 'Grace', preferredTranslation: 'KJV', dailyGoal: 3 })
    const today = toLocalDateKey(new Date())

    // A failed game doesn't count towards the goal.
    let game = await play('psalm-23-1-kjv', 'word-order', 0.3)
    expect(game.day.studiedScriptureIds).toEqual([])

    await play('psalm-23-1-kjv', 'missing-words')
    await play('psalm-23-1-kjv', 'word-order')
    game = await play('psalm-23-1-kjv', 'recall') // recall + scripture learned
    expect(game.questsCompleted.map((q) => q.questId).sort()).toEqual(['learn_one_scripture', 'recall_challenge'])
    expect(game.dailyGoalJustCompleted).toBe(false)

    game = await play('john-3-16-kjv', 'missing-words') // second scripture
    expect(game.dailyGoalJustCompleted).toBe(false)
    const seedsBefore = useGameStore.getState().resources!.seeds
    game = await play('genesis-1-1-kjv', 'missing-words') // third scripture → goal of 3 reached
    expect(game.dailyGoalJustCompleted).toBe(true)
    expect(game.rewards.some((r) => r.id === `daily-goal:${today}` && r.seedsDelta === 1)).toBe(true)
    expect(useGameStore.getState().resources!.seeds).toBe(seedsBefore + 1)
    expect(game.questsCompleted.map((q) => q.questId)).toEqual(['complete_daily_goal'])

    // Claim each quest once.
    const coinsBefore = useGameStore.getState().resources!.coins
    await useQuestStore.getState().claimQuest(`${today}:recall_challenge`)
    expect(useGameStore.getState().resources!.coins).toBe(coinsBefore + 10)
    await expect(useQuestStore.getState().claimQuest(`${today}:recall_challenge`)).rejects.toThrow(/Already/)

    // Everything survives a restart.
    forgetMemory()
    await closeDatabase()
    await useGameStore.getState().hydrate()
    const quests = useQuestStore.getState().quests
    expect(quests.find((q) => q.questId === 'recall_challenge')).toMatchObject({ rewardClaimed: true })
    expect(quests.find((q) => q.questId === 'complete_daily_goal')).toMatchObject({ progress: 1 })
    expect(useQuestStore.getState().days[today].goalCompletedAt).not.toBeNull()
    expect(quests).toHaveLength(3) // no duplicate set created on reload
  })

  it('cannot claim an unfinished quest', async () => {
    forgetMemory()
    await useGameStore.getState().createGuestPlayer({ displayName: 'Grace', preferredTranslation: 'KJV', dailyGoal: 3 })
    const id = useQuestStore.getState().quests[0].id
    await expect(useQuestStore.getState().claimQuest(id)).rejects.toThrow(/not complete/)
  })
})
