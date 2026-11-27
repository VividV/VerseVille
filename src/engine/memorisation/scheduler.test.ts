import { describe, expect, it } from 'vitest'
import { firstReview, intervalForStep, isDue, reviewDateAfter, scheduleAfterAssistedReview, scheduleAfterRecall } from './scheduler'

const at = (s: string) => new Date(s) // local time (no "Z")

describe('scheduler (spec §10)', () => {
  it('uses the interval ladder 1, 3, 7, 14, 30, 60 days, then keeps growing to a maximum', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(intervalForStep)).toEqual([1, 3, 7, 14, 30, 60, 120, 180])
    expect(intervalForStep(50)).toBe(180)
  })

  it('makes reviews due at local midnight', () => {
    const due = reviewDateAfter(at('2026-11-27T21:45:00'), 1)
    expect(due.getFullYear()).toBe(2026)
    expect(due.getMonth()).toBe(10)
    expect(due.getDate()).toBe(28)
    expect(due.getHours()).toBe(0)
    expect(due.getMinutes()).toBe(0)
  })

  it('schedules the first review for tomorrow', () => {
    expect(firstReview(at('2026-11-27T10:00:00'))).toEqual({
      intervalStep: 0,
      nextReviewAt: at('2026-11-28T00:00:00').toISOString(),
    })
  })

  it('advances the interval after a successful due recall', () => {
    const now = at('2026-11-28T09:00:00')
    const r = scheduleAfterRecall({ intervalStep: 0, nextReviewAt: at('2026-11-28T00:00:00').toISOString() }, 'success', now)
    expect(r.intervalStep).toBe(1)
    expect(r.nextReviewAt).toBe(at('2026-12-01T00:00:00').toISOString()) // 3 days
  })

  it('does not stretch the interval for early practice', () => {
    const current = { intervalStep: 2, nextReviewAt: at('2026-12-05T00:00:00').toISOString() }
    expect(scheduleAfterRecall(current, 'success', at('2026-11-28T09:00:00'))).toEqual(current)
  })

  it('reviews again in 2 days after a partial recall (60–84%)', () => {
    const r = scheduleAfterRecall({ intervalStep: 3, nextReviewAt: at('2026-11-28T00:00:00').toISOString() }, 'partial', at('2026-11-28T09:00:00'))
    expect(r).toEqual({ intervalStep: 3, nextReviewAt: at('2026-11-30T00:00:00').toISOString() })
  })

  it('goes back to the start and reviews tomorrow after a failed recall (<60%)', () => {
    const r = scheduleAfterRecall({ intervalStep: 4, nextReviewAt: at('2026-12-20T00:00:00').toISOString() }, 'failed', at('2026-11-28T09:00:00'))
    expect(r).toEqual({ intervalStep: 0, nextReviewAt: at('2026-11-29T00:00:00').toISOString() })
  })

  it('keeps the interval for assisted reviews', () => {
    const now = at('2026-11-28T09:00:00')
    expect(scheduleAfterAssistedReview({ intervalStep: 2 }, true, now).nextReviewAt).toBe(at('2026-12-05T00:00:00').toISOString())
    expect(scheduleAfterAssistedReview({ intervalStep: 2 }, false, now).nextReviewAt).toBe(at('2026-11-29T00:00:00').toISOString())
  })

  it('knows when a review is due', () => {
    expect(isDue(null, at('2026-11-28T00:00:00'))).toBe(false)
    expect(isDue(at('2026-11-28T00:00:00').toISOString(), at('2026-11-28T00:00:00'))).toBe(true)
    expect(isDue(at('2026-11-28T00:00:00').toISOString(), at('2026-11-27T23:59:59'))).toBe(false)
  })
})
