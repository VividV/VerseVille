import { describe, expect, it } from 'vitest'
import { getScriptures } from '../scripture/scriptureCatalog'
import { applyGameResult, createProgress } from './learningEngine'
import { getDueReviews, getNextActivity, nextLearningStep, recommendGameFor } from './reviewQueue'

const all = getScriptures('KJV')
const now = new Date('2026-11-27T12:00:00')

describe('review queue (spec §10)', () => {
  it('recommends a new scripture when nothing is started', () => {
    expect(getNextActivity(all, {}, now)).toMatchObject({ reason: 'new', gameType: 'missing-words', scripture: all[0] })
  })

  it('puts due reviews first, most overdue first', () => {
    const a = { ...createProgress('john-3-16-kjv', now), learnedAt: 'x', status: 'strong' as const, nextReviewAt: '2026-11-26T00:00:00' }
    const b = { ...createProgress('genesis-1-1-kjv', now), learnedAt: 'x', nextReviewAt: '2026-11-20T00:00:00' }
    const c = { ...createProgress('romans-8-28-kjv', now), learnedAt: 'x', nextReviewAt: '2026-12-20T00:00:00' }
    const map = { [a.scriptureId]: a, [b.scriptureId]: b, [c.scriptureId]: c }
    expect(getDueReviews(map, now).map((p) => p.scriptureId)).toEqual(['genesis-1-1-kjv', 'john-3-16-kjv'])
    expect(getNextActivity(all, map, now)).toMatchObject({ reason: 'review', scripture: { id: 'genesis-1-1-kjv' } })
  })

  it('continues an unfinished scripture before starting a new one', () => {
    const p = applyGameResult(undefined, { scriptureId: 'romans-8-28-kjv', gameType: 'missing-words', accuracy: 1, completedAt: now }).progress
    expect(getNextActivity(all, { [p.scriptureId]: p }, now)).toMatchObject({
      reason: 'continue',
      gameType: 'word-order',
      scripture: { id: 'romans-8-28-kjv' },
    })
  })

  it('returns null when everything is started and nothing is due', () => {
    const map = Object.fromEntries(
      all.map((s) => [s.id, { ...createProgress(s.id, now), learnedAt: 'x', nextReviewAt: '2027-01-01T00:00:00' }]),
    )
    expect(getNextActivity(all, map, now)).toBeNull()
  })

  it('recommends games from the learning sequence, then by status', () => {
    expect(recommendGameFor(undefined)).toBe('missing-words')
    const started = { ...createProgress('x', now), completedGameTypes: ['missing-words' as const] }
    expect(nextLearningStep(started)).toBe('word-order')
    const learned = { ...createProgress('x', now), learnedAt: 'x' }
    expect(recommendGameFor({ ...learned, status: 'growing' })).toBe('word-order')
    expect(recommendGameFor({ ...learned, status: 'strong' })).toBe('recall')
    expect(recommendGameFor({ ...learned, status: 'mastered' })).toBe('recall')
  })
})
