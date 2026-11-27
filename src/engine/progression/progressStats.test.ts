import { describe, expect, it } from 'vitest'
import { createProgress } from '../memorisation/learningEngine'
import { computeProgressStats, gardenStage } from './progressStats'
import type { GameSession } from '../../types/games'

const now = new Date('2026-11-27T10:00:00')
const session = (accuracy: number, daysAgo: number, gameType: GameSession['gameType'] = 'recall'): GameSession => ({
  id: `${accuracy}-${daysAgo}`,
  scriptureId: 'x',
  gameType,
  accuracy,
  score: accuracy * 100,
  durationSeconds: 10,
  completedAt: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
  rewardsGranted: true,
  details: { kind: 'assisted', totalItems: 1, correctFirstTry: 1, hintsUsed: 0, mistakes: 0 },
})

describe('progress stats (spec Screen 14)', () => {
  it('puts long-term recall first and counts learning milestones', () => {
    const base = createProgress('a', now)
    const progress = {
      a: { ...base, scriptureId: 'a', status: 'mastered' as const, learnedAt: 'x', masteredAt: 'x', reviewsCompleted: 3 },
      b: { ...base, scriptureId: 'b', status: 'strong' as const, learnedAt: 'x', reviewsCompleted: 2 },
      c: { ...base, scriptureId: 'c', status: 'growing' as const },
    }
    const stats = computeProgressStats({
      progress,
      sessions: [session(1, 1), session(0.5, 2), session(0.2, 40), session(1, 1, 'word-order')],
      days: {},
      now,
    })
    expect(stats).toMatchObject({ versesYouCanRecall: 2, learned: 2, mastered: 1, started: 3, reviewsCompleted: 5, recallAttempts: 2 })
    expect(stats.recallAccuracy).toBeCloseTo(0.75) // only recalls in the last 30 days
  })

  it('has no recall accuracy before the first recall', () => {
    expect(computeProgressStats({ progress: {}, sessions: [], days: {}, now }).recallAccuracy).toBeNull()
  })

  it('names garden stages', () => {
    expect(gardenStage(6, 0).name).toBe('Young Garden')
    expect(gardenStage(15, 0).name).toBe('Blooming Garden')
    expect(gardenStage(3, 1).name).toBe('Growing Village')
  })
})
