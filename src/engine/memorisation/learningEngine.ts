/**
 * The learning engine: applies one finished game to a scripture's progress.
 * Combines the mastery rules (mastery.ts) and the review schedule (scheduler.ts),
 * and reports the learning events that quests and rewards will listen to.
 * Pure and deterministic: pass in `completedAt` instead of reading the clock.
 */
import type { GameType } from '../../types/games'
import type { MasteryChangeKind, PlayerScripture } from '../../types/scripture'
import { toLocalDateKey } from '../../utils/dateUtils'
import { ASSISTED_MASTERY_CAP, addMastery, isFailedRecall, isSuccessful, masteryStatus, reduceMastery } from './mastery'
import { firstReview, isDue, scheduleAfterAssistedReview, scheduleAfterRecall, type RecallOutcome } from './scheduler'

export const LEARNING_SEQUENCE: GameType[] = ['missing-words', 'word-order', 'recall']

/** Learning events (spec §14). */
export interface LearningEvents {
  scriptureStarted: boolean
  scriptureLearned: boolean
  reviewCompleted: boolean
  recallCompleted: boolean
  scriptureMastered: boolean
}

export interface GameResultInput {
  scriptureId: string
  gameType: GameType
  accuracy: number
  completedAt: Date
}

/** Why mastery did (or didn't) change, so the result screen can explain it. */
export type MasteryNote =
  | 'gained' // went up
  | 'reduced' // failed recall
  | 'needs-recall' // assisted game, but already at the Growing cap
  | 'already-today' // this activity already changed mastery today
  | 'not-successful' // accuracy below the success line

export interface LearningUpdate {
  progress: PlayerScripture
  events: LearningEvents
  successful: boolean
  masteryChange: number
  masteryNote: MasteryNote
  recallOutcome: RecallOutcome | null
}

export function createProgress(scriptureId: string, now: Date): PlayerScripture {
  const iso = now.toISOString()
  return {
    scriptureId,
    status: 'learning',
    masteryScore: 0,
    learningStartedAt: iso,
    lastReviewedAt: null,
    nextReviewAt: null,
    consecutiveSuccesses: 0,
    totalAttempts: 0,
    successfulAttempts: 0,
    masteredAt: null,
    completedGameTypes: [],
    learnedAt: null,
    intervalStep: 0,
    successfulRecallDays: [],
    masteryChangeDays: {},
    reviewsCompleted: 0,
    updatedAt: iso,
  }
}

export function applyGameResult(previous: PlayerScripture | undefined, input: GameResultInput): LearningUpdate {
  const now = input.completedAt
  const iso = now.toISOString()
  const today = toLocalDateKey(now)
  const base = previous ?? createProgress(input.scriptureId, now)
  const wasDue = previous !== undefined && isDue(previous.nextReviewAt, now)
  const isRecall = input.gameType === 'recall'
  const successful = isSuccessful(input.gameType, input.accuracy)
  const recallOutcome: RecallOutcome | null = !isRecall
    ? null
    : successful
      ? 'success'
      : isFailedRecall(input.accuracy)
        ? 'failed'
        : 'partial'

  const p: PlayerScripture = {
    ...base,
    totalAttempts: base.totalAttempts + 1,
    successfulAttempts: base.successfulAttempts + (successful ? 1 : 0),
    completedGameTypes: base.completedGameTypes.includes(input.gameType)
      ? base.completedGameTypes
      : [...base.completedGameTypes, input.gameType],
    masteryChangeDays: { ...base.masteryChangeDays },
    updatedAt: iso,
  }

  // Mastery: each kind of change at most once per scripture per day.
  const changeKind: MasteryChangeKind | null =
    recallOutcome === 'failed' ? 'recall-failed' : successful ? input.gameType : null
  const before = p.masteryScore
  let masteryNote: MasteryNote = 'not-successful'
  if (changeKind && p.masteryChangeDays[changeKind] === today) {
    masteryNote = 'already-today'
  } else if (changeKind) {
    p.masteryScore = changeKind === 'recall-failed' ? reduceMastery(before) : addMastery(before, input.gameType)
    p.masteryChangeDays[changeKind] = today
    masteryNote =
      changeKind === 'recall-failed'
        ? 'reduced'
        : p.masteryScore > before
          ? 'gained'
          : !isRecall && before >= ASSISTED_MASTERY_CAP
            ? 'needs-recall'
            : 'gained'
  }

  // Recall streak and the "3 separate days" record.
  if (recallOutcome === 'success') {
    p.consecutiveSuccesses = base.consecutiveSuccesses + 1
    if (!p.successfulRecallDays.includes(today)) p.successfulRecallDays = [...p.successfulRecallDays, today]
  } else if (recallOutcome === 'failed') {
    p.consecutiveSuccesses = 0
  }

  // Review schedule.
  const schedule =
    base.nextReviewAt === null
      ? firstReview(now) // first learning session: review tomorrow
      : recallOutcome
        ? scheduleAfterRecall(base, recallOutcome, now)
        : wasDue
          ? scheduleAfterAssistedReview(base, successful, now)
          : { intervalStep: base.intervalStep, nextReviewAt: base.nextReviewAt }
  p.intervalStep = schedule.intervalStep
  p.nextReviewAt = schedule.nextReviewAt

  if (wasDue) {
    p.reviewsCompleted = base.reviewsCompleted + 1
    p.lastReviewedAt = iso
  }

  // Learned = all three activities of the learning sequence finished (spec §9.2).
  const newlyLearned = p.learnedAt === null && LEARNING_SEQUENCE.every((g) => p.completedGameTypes.includes(g))
  if (newlyLearned) p.learnedAt = iso

  p.status = masteryStatus(p.masteryScore, p.successfulRecallDays.length)
  const newlyMastered = p.status === 'mastered' && p.masteredAt === null
  if (newlyMastered) p.masteredAt = iso

  return {
    progress: p,
    successful,
    recallOutcome,
    masteryChange: p.masteryScore - before,
    masteryNote,
    events: {
      scriptureStarted: previous === undefined,
      scriptureLearned: newlyLearned,
      reviewCompleted: wasDue,
      recallCompleted: isRecall,
      scriptureMastered: newlyMastered,
    },
  }
}
