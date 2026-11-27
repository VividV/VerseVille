import { describe, expect, it } from 'vitest'
import type { GameSession, GameType } from '../../types/games'
import type { PlayerResources } from '../../types/player'
import type { RewardTransaction } from '../../types/rewards'
import { applyGameResult, createProgress, type LearningUpdate } from '../memorisation/learningEngine'
import { REWARD_CONFIG, accuracyMultiplier, applyMultiplier, calculateGameRewards } from './rewardCalculator'
import { InsufficientResourcesError, STARTING_RESOURCES, applyTransactions, canAfford } from './economy'

const ID = 'psalm-23-1-kjv'
const NOW = '2026-11-27T10:00:00'

function session(gameType: GameType, accuracy: number, completedAt = NOW, id = `s-${Math.random()}`): GameSession {
  return {
    id,
    scriptureId: ID,
    gameType,
    accuracy,
    score: Math.round(accuracy * 100),
    durationSeconds: 30,
    completedAt: new Date(completedAt).toISOString(),
    rewardsGranted: false,
    details: { kind: 'assisted', totalItems: 1, correctFirstTry: 1, hintsUsed: 0, mistakes: 0 },
  }
}

function rewardsFor(s: GameSession, update: LearningUpdate, existing: RewardTransaction[] = []) {
  return calculateGameRewards({ session: s, update, existingTransactionIds: new Set(existing.map((t) => t.id)), allTransactions: existing })
}

const learn = (s: GameSession, previous = createProgress(ID, new Date(NOW))) =>
  applyGameResult(previous, { scriptureId: ID, gameType: s.gameType, accuracy: s.accuracy, completedAt: new Date(s.completedAt) })

describe('accuracy multiplier (spec §11.4)', () => {
  it('matches the spec bands', () => {
    expect(accuracyMultiplier(0.4)).toBe(1)
    expect(accuracyMultiplier(0.7)).toBe(1)
    expect(accuracyMultiplier(0.85)).toBe(1.2)
    expect(accuracyMultiplier(0.94)).toBe(1.2)
    expect(accuracyMultiplier(0.95)).toBe(1.5)
    expect(accuracyMultiplier(1)).toBe(1.5)
  })
  it('follows the spec example: 10 coins at 90% → 12', () => {
    expect(applyMultiplier(10, 0.9)).toBe(12)
  })
})

describe('calculateGameRewards (spec §11, §20)', () => {
  it('gives the base game rewards with the multiplier', () => {
    const s = session('recall', 0.9)
    const { transactions } = rewardsFor(s, learn(s))
    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({ id: `game:${ID}:recall:2026-11-27`, xpDelta: 18, coinsDelta: 12 }) // 15×1.2, 10×1.2
  })

  it('gives Missing Words and Word Order 5 XP / 5 coins at base', () => {
    for (const g of ['missing-words', 'word-order'] as const) {
      const s = session(g, 0.7)
      expect(rewardsFor(s, learn(s)).transactions[0]).toMatchObject({ xpDelta: 5, coinsDelta: 5 })
    }
  })

  it('gives nothing below 60% accuracy (but never takes anything away)', () => {
    const s = session('word-order', 0.5)
    expect(rewardsFor(s, learn(s))).toEqual({ transactions: [], skipped: 'low-accuracy' })
  })

  it('rewards only the first completion of each game per scripture per day', () => {
    const first = session('missing-words', 1)
    const r1 = rewardsFor(first, learn(first))
    const again = session('missing-words', 1, '2026-11-27T18:00:00')
    expect(rewardsFor(again, learn(again), r1.transactions)).toEqual({ transactions: [], skipped: 'already-earned-today' })
    const nextDay = session('missing-words', 1, '2026-11-28T09:00:00')
    expect(rewardsFor(nextDay, learn(nextDay), r1.transactions).transactions).toHaveLength(1)
  })

  it('stops game coins and XP at the daily cap', () => {
    const earned: RewardTransaction[] = [
      {
        id: 'game:other:recall:2026-11-27',
        sourceType: 'game',
        sourceId: 'other',
        sessionId: null,
        coinsDelta: REWARD_CONFIG.dailyCoinCap - 3,
        seedsDelta: 0,
        gemsDelta: 0,
        xpDelta: REWARD_CONFIG.dailyXpCap,
        label: 'x',
        createdAt: new Date(NOW).toISOString(),
      },
    ]
    const s = session('recall', 1)
    const { transactions } = rewardsFor(s, learn(s), earned)
    expect(transactions[0]).toMatchObject({ coinsDelta: 3, xpDelta: 0 })
    const s2 = session('word-order', 1)
    expect(rewardsFor(s2, learn(s2), [...earned, ...transactions]).skipped).toBe('daily-cap')
  })

  it('adds learned and mastered milestones once, without multiplier', () => {
    const s = session('recall', 1)
    const update = learn(s)
    const fake: LearningUpdate = { ...update, events: { ...update.events, scriptureLearned: true, scriptureMastered: true } }
    const { transactions } = rewardsFor(s, fake)
    expect(transactions.find((t) => t.sourceType === 'scripture-learned')).toMatchObject({ xpDelta: 10, seedsDelta: 1, coinsDelta: 0 })
    expect(transactions.find((t) => t.sourceType === 'scripture-mastered')).toMatchObject({ xpDelta: 25, coinsDelta: 15, seedsDelta: 1 })
    // Never again, even on another day.
    const later = session('recall', 1, '2026-12-20T10:00:00')
    const again = rewardsFor(later, { ...fake }, transactions).transactions
    expect(again.some((t) => t.sourceType.startsWith('scripture-'))).toBe(false)
  })

  it('pays review coins for a successful due review', () => {
    // Learned yesterday, due today.
    let p = applyGameResult(undefined, { scriptureId: ID, gameType: 'recall', accuracy: 1, completedAt: new Date('2026-11-26T10:00:00') }).progress
    const s = session('recall', 0.96)
    const update = learn(s, p)
    expect(update.events.reviewCompleted).toBe(true)
    const review = rewardsFor(s, update).transactions.find((t) => t.sourceType === 'review')
    expect(review).toMatchObject({ coinsDelta: 8, id: `review:${ID}:2026-11-27` }) // 5 × 1.5 = 7.5 → 8
    p = update.progress
  })
})

describe('economy (spec §20)', () => {
  const start: PlayerResources = { ...STARTING_RESOURCES, updatedAt: NOW }
  const tx = (coinsDelta: number, xpDelta = 0): RewardTransaction => ({
    id: `t${coinsDelta}${xpDelta}`,
    sourceType: 'game',
    sourceId: ID,
    sessionId: null,
    coinsDelta,
    seedsDelta: 0,
    gemsDelta: 0,
    xpDelta,
    label: '',
    createdAt: NOW,
  })

  it('applies rewards and levels up from total XP', () => {
    const r = applyTransactions(start, [tx(10, 160)], new Date(NOW))
    expect(r).toMatchObject({ coins: 110, xp: 160, level: 2 })
  })

  it('never allows a negative balance', () => {
    expect(() => applyTransactions(start, [tx(-101)], new Date(NOW))).toThrow(InsufficientResourcesError)
    expect(applyTransactions(start, [tx(-100)], new Date(NOW)).coins).toBe(0)
  })

  it('checks affordability', () => {
    expect(canAfford(start, { coins: 100, seeds: 5 })).toBe(true)
    expect(canAfford(start, { coins: 101 })).toBe(false)
    expect(canAfford(start, { seeds: 6 })).toBe(false)
  })
})
