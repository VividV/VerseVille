import { describe, expect, it } from 'vitest'
import { useGameStore } from './gameStore'
import { DEFAULT_SETTINGS, useSettingsStore } from './settingsStore'
import { closeDatabase, getAllRecords } from '../services/persistence/localDatabase'
import { saveCompletedGame } from '../services/persistence/saveService'
import { createGameSession } from '../engine/games/gameSession'
import type { GameType } from '../types/games'
import type { RewardTransaction } from '../types/rewards'

function forgetMemory() {
  useGameStore.setState({ status: 'loading', profile: null, resources: null, scriptureProgress: {}, rewardTransactions: [], lastGame: null })
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
}

function session(gameType: GameType, accuracy: number, when: string) {
  const at = new Date(when)
  return createGameSession({
    scriptureId: 'psalm-23-1-kjv',
    gameType,
    accuracy,
    details: { kind: 'assisted', totalItems: 1, correctFirstTry: 1, hintsUsed: 0, mistakes: 0 },
    startedAt: at,
    now: at,
  })
}

describe('rewards in the store', () => {
  it('grants rewards once, saves them with the session, and survives a restart', async () => {
    forgetMemory()
    await useGameStore.getState().createGuestPlayer({ displayName: 'Grace', preferredTranslation: 'KJV', dailyGoal: 3 })
    await useGameStore.getState().completeGame(session('missing-words', 1, '2026-11-27T10:00:00')) // 8 XP, 8 coins
    await useGameStore.getState().completeGame(session('word-order', 1, '2026-11-27T10:05:00')) // 8, 8
    const last = await useGameStore.getState().completeGame(session('recall', 1, '2026-11-27T10:10:00')) // 23 XP, 15 coins + learned 10 XP 1 seed
    expect(last.rewards.map((r) => r.sourceType)).toEqual(['game', 'scripture-learned'])
    expect(useGameStore.getState().resources).toMatchObject({ coins: 131, seeds: 6, xp: 49, level: 1 })

    // Same game again today: no new rewards.
    const repeat = await useGameStore.getState().completeGame(session('recall', 1, '2026-11-27T11:00:00'))
    expect(repeat.rewards).toEqual([])
    expect(repeat.rewardSkipped).toBe('already-earned-today')

    forgetMemory()
    await closeDatabase()
    await useGameStore.getState().hydrate()
    expect(useGameStore.getState().resources).toMatchObject({ coins: 131, seeds: 6, xp: 49 })
    expect(useGameStore.getState().rewardTransactions).toHaveLength(4)
    const sessions = await getAllRecords<{ rewardsGranted: boolean }>('gameSessions')
    expect(sessions.every((s) => s.rewardsGranted)).toBe(true)
  })

  it('the database refuses a duplicate reward transaction and saves nothing from that attempt', async () => {
    forgetMemory()
    await useGameStore.getState().createGuestPlayer({ displayName: 'Grace', preferredTranslation: 'KJV', dailyGoal: 3 })
    const first = await useGameStore.getState().completeGame(session('recall', 1, '2026-11-27T10:00:00'))
    const duplicate: RewardTransaction = first.rewards[0]
    const resources = useGameStore.getState().resources!
    const s2 = session('recall', 1, '2026-11-27T12:00:00')

    await expect(
      saveCompletedGame({
        session: s2,
        progress: first.update.progress,
        transactions: [duplicate],
        resources: { ...resources, coins: resources.coins + 999 },
      }),
    ).rejects.toBeTruthy()

    const coinsSaved = (await getAllRecords<{ coins: number }>('resources'))[0].coins
    expect(coinsSaved).toBe(resources.coins)
    expect((await getAllRecords('gameSessions')).length).toBe(1)
  })
})
