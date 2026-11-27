/**
 * Spaced repetition scheduler (spec §10). Deterministic: give it the same
 * inputs and "now" and it always returns the same answer.
 *
 * Reviews become due at the START of the player's local day, so a review
 * "after 1 day" is ready first thing tomorrow, in the player's own timezone.
 */
import { addLocalDays, startOfLocalDay } from '../../utils/dateUtils'

/** Days between reviews. After the last step the interval stays at the maximum. */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60, 120, 180] as const
export const PARTIAL_RECALL_DAYS = 2
export const FAILED_RECALL_DAYS = 1

export function intervalForStep(step: number): number {
  const i = Math.min(Math.max(step, 0), REVIEW_INTERVALS_DAYS.length - 1)
  return REVIEW_INTERVALS_DAYS[i]
}

/** The moment a review becomes due: local midnight `days` days after `now`. */
export function reviewDateAfter(now: Date, days: number): Date {
  return startOfLocalDay(addLocalDays(now, days))
}

export function isDue(nextReviewAt: string | null, now: Date): boolean {
  return nextReviewAt !== null && new Date(nextReviewAt).getTime() <= now.getTime()
}

export type RecallOutcome = 'success' | 'partial' | 'failed'

export interface ScheduleUpdate {
  intervalStep: number
  nextReviewAt: string
}

/**
 * Schedule after a Verse Recall (spec §10 failure handling):
 *   85%+    → when due: advance to the next interval. Early practice keeps the schedule.
 *   60–84%  → review again in 2 days (interval unchanged)
 *   <60%    → back to the first step, review tomorrow
 */
export function scheduleAfterRecall(
  current: { intervalStep: number; nextReviewAt: string | null },
  outcome: RecallOutcome,
  now: Date,
): ScheduleUpdate {
  if (outcome === 'failed') {
    return { intervalStep: 0, nextReviewAt: reviewDateAfter(now, FAILED_RECALL_DAYS).toISOString() }
  }
  if (outcome === 'partial') {
    return { intervalStep: current.intervalStep, nextReviewAt: reviewDateAfter(now, PARTIAL_RECALL_DAYS).toISOString() }
  }
  if (!isDue(current.nextReviewAt, now) && current.nextReviewAt !== null) {
    // Practising before the review is due doesn't stretch the interval.
    return { intervalStep: current.intervalStep, nextReviewAt: current.nextReviewAt }
  }
  const step = current.intervalStep + 1
  return { intervalStep: step, nextReviewAt: reviewDateAfter(now, intervalForStep(step)).toISOString() }
}

/**
 * Schedule after Missing Words or Word Order played while a review is due.
 * Easier games keep the verse watered but don't stretch the interval:
 *   60%+ → same interval again; below 60% → tomorrow.
 */
export function scheduleAfterAssistedReview(
  current: { intervalStep: number },
  successful: boolean,
  now: Date,
): ScheduleUpdate {
  const days = successful ? intervalForStep(current.intervalStep) : FAILED_RECALL_DAYS
  return { intervalStep: current.intervalStep, nextReviewAt: reviewDateAfter(now, days).toISOString() }
}

/** First review after the first learning session: tomorrow (spec §10). */
export function firstReview(now: Date): ScheduleUpdate {
  return { intervalStep: 0, nextReviewAt: reviewDateAfter(now, REVIEW_INTERVALS_DAYS[0]).toISOString() }
}
