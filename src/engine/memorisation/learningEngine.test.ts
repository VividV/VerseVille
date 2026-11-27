import { describe, expect, it } from 'vitest'
import type { GameType } from '../../types/games'
import type { PlayerScripture } from '../../types/scripture'
import { applyGameResult, type LearningUpdate } from './learningEngine'

const ID = 'psalm-23-1-kjv'
const at = (s: string) => new Date(s)

function play(p: PlayerScripture | undefined, gameType: GameType, accuracy: number, when: string): LearningUpdate {
  return applyGameResult(p, { scriptureId: ID, gameType, accuracy, completedAt: at(when) })
}

describe('learning engine', () => {
  it('starts a scripture on its first game and schedules a review for tomorrow', () => {
    const r = play(undefined, 'missing-words', 1, '2026-11-27T10:00:00')
    expect(r.events.scriptureStarted).toBe(true)
    expect(r.progress).toMatchObject({ status: 'learning', masteryScore: 10, totalAttempts: 1, successfulAttempts: 1 })
    expect(r.progress.nextReviewAt).toBe(at('2026-11-28T00:00:00').toISOString())
  })

  it('follows the learning sequence and marks the scripture learned (spec §9.2)', () => {
    let r = play(undefined, 'missing-words', 1, '2026-11-27T10:00:00')
    r = play(r.progress, 'word-order', 1, '2026-11-27T10:05:00')
    expect(r.progress.masteryScore).toBe(25)
    expect(r.progress.status).toBe('growing')
    expect(r.events.scriptureLearned).toBe(false)
    r = play(r.progress, 'recall', 0.9, '2026-11-27T10:10:00')
    expect(r.events.scriptureLearned).toBe(true)
    expect(r.events.recallCompleted).toBe(true)
    expect(r.progress.masteryScore).toBe(50)
    expect(r.progress.status).toBe('strong')
    // Practising recall on the day you learn it doesn't stretch the first review.
    expect(r.progress.nextReviewAt).toBe(at('2026-11-28T00:00:00').toISOString())
  })

  it('counts each mastery change only once per day', () => {
    let r = play(undefined, 'missing-words', 1, '2026-11-27T10:00:00')
    r = play(r.progress, 'missing-words', 1, '2026-11-27T10:01:00')
    expect(r.progress.masteryScore).toBe(10)
    expect(r.masteryNote).toBe('already-today')
    r = play(r.progress, 'missing-words', 1, '2026-11-28T10:00:00')
    expect(r.progress.masteryScore).toBe(20)
  })

  it('does not reward unsuccessful assisted games', () => {
    const r = play(undefined, 'word-order', 0.5, '2026-11-27T10:00:00')
    expect(r.progress.masteryScore).toBe(0)
    expect(r.masteryNote).toBe('not-successful')
    expect(r.progress.successfulAttempts).toBe(0)
  })

  it('a single easy game, or many, never makes a scripture mastered', () => {
    let p: PlayerScripture | undefined
    for (let day = 1; day <= 20; day++) {
      const when = `2026-12-${String(day).padStart(2, '0')}T10:00:00`
      p = play(p, 'missing-words', 1, when).progress
      p = play(p, 'word-order', 1, when).progress
    }
    expect(p!.masteryScore).toBe(49)
    expect(p!.status).toBe('growing')
  })

  it('failed recall reduces mastery, resets the streak and reviews tomorrow', () => {
    let r = play(undefined, 'recall', 1, '2026-11-27T10:00:00')
    r = play(r.progress, 'recall', 1, '2026-11-28T10:00:00')
    expect(r.progress.consecutiveSuccesses).toBe(2)
    const before = r.progress.masteryScore
    r = play(r.progress, 'recall', 0.3, '2026-11-29T10:00:00')
    expect(r.recallOutcome).toBe('failed')
    expect(r.progress.masteryScore).toBe(before - 10)
    expect(r.progress.consecutiveSuccesses).toBe(0)
    expect(r.progress.intervalStep).toBe(0)
    expect(r.progress.nextReviewAt).toBe(at('2026-11-30T00:00:00').toISOString())
    // Failing again the same day doesn't take more away.
    expect(play(r.progress, 'recall', 0.1, '2026-11-29T11:00:00').progress.masteryScore).toBe(before - 10)
  })

  it('partial recall keeps mastery and reviews in 2 days', () => {
    let r = play(undefined, 'recall', 1, '2026-11-27T10:00:00')
    const score = r.progress.masteryScore
    r = play(r.progress, 'recall', 0.7, '2026-11-28T10:00:00')
    expect(r.recallOutcome).toBe('partial')
    expect(r.progress.masteryScore).toBe(score)
    expect(r.progress.nextReviewAt).toBe(at('2026-11-30T00:00:00').toISOString())
  })

  it('masters a verse only after successful recalls on 3 separate days, following the review schedule', () => {
    // Day 1: learn it.
    let r = play(undefined, 'missing-words', 1, '2026-11-27T10:00:00')
    r = play(r.progress, 'word-order', 1, '2026-11-27T10:05:00')
    r = play(r.progress, 'recall', 1, '2026-11-27T10:10:00') // recall day 1, score 50
    // Many recalls on the same day don't help.
    r = play(r.progress, 'recall', 1, '2026-11-27T10:20:00')
    expect(r.progress.successfulRecallDays).toEqual(['2026-11-27'])
    expect(r.progress.masteryScore).toBe(50)

    // Day 2 (due): recall day 2, score 75, next review in 3 days.
    r = play(r.progress, 'recall', 0.95, '2026-11-28T08:00:00')
    expect(r.events.reviewCompleted).toBe(true)
    expect(r.progress.status).toBe('strong')
    expect(r.progress.nextReviewAt).toBe(at('2026-12-01T00:00:00').toISOString())

    // Day 5 (due): recall day 3, score 100 → Mastered. Next review in 7 days.
    r = play(r.progress, 'recall', 1, '2026-12-01T19:00:00')
    expect(r.events.scriptureMastered).toBe(true)
    expect(r.progress.status).toBe('mastered')
    expect(r.progress.masteredAt).toBe(at('2026-12-01T19:00:00').toISOString())
    expect(r.progress.nextReviewAt).toBe(at('2026-12-08T00:00:00').toISOString())
    expect(r.progress.reviewsCompleted).toBe(2)
  })

  it('an assisted game while due counts as a review but keeps the interval', () => {
    let r = play(undefined, 'recall', 1, '2026-11-27T10:00:00')
    r = play(r.progress, 'recall', 1, '2026-11-28T10:00:00') // step 1 (3 days)
    r = play(r.progress, 'word-order', 1, '2026-12-01T10:00:00') // due
    expect(r.events.reviewCompleted).toBe(true)
    expect(r.progress.intervalStep).toBe(1)
    expect(r.progress.nextReviewAt).toBe(at('2026-12-04T00:00:00').toISOString())
  })
})
