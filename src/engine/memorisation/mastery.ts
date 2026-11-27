/**
 * Mastery score rules (spec §9.4). Pure functions — no React, no saving.
 *
 *   Successful Missing Words  +10   (assisted)
 *   Successful Word Order     +15   (assisted)
 *   Successful Verse Recall   +25   (independent)
 *   Failed Verse Recall       −10
 *   Score always stays between 0 and 100.
 *
 * Extra VerseVille rules (documented in the README):
 *   - Assisted games can raise the score to 49 at most (top of "Growing").
 *     Reaching Strong needs independent recall.
 *   - Each kind of change counts once per scripture per local day, so
 *     repeating a game can't farm mastery and forgetting isn't punished twice.
 *   - Mastered needs a score of 80+ AND successful recalls on 3 separate days.
 */
import type { GameType } from '../../types/games'
import type { ScriptureStatus } from '../../types/scripture'

export const MASTERY_GAINS: Record<GameType, number> = {
  'missing-words': 10,
  'word-order': 15,
  recall: 25,
}
export const FAILED_RECALL_PENALTY = 10
export const ASSISTED_MASTERY_CAP = 49
export const MASTERY_MIN = 0
export const MASTERY_MAX = 100
export const REQUIRED_RECALL_DAYS = 3

/** Accuracy needed for a game to count as a success. */
export const SUCCESS_THRESHOLD: Record<GameType, number> = {
  'missing-words': 0.6,
  'word-order': 0.6,
  recall: 0.85,
}
/** Below this a Verse Recall counts as failed (spec §10). */
export const RECALL_FAIL_BELOW = 0.6

export function clampMastery(score: number): number {
  return Math.min(MASTERY_MAX, Math.max(MASTERY_MIN, Math.round(score)))
}

export function isSuccessful(gameType: GameType, accuracy: number): boolean {
  // Compare whole percentages so 84.6% (shown as 85%) counts the same as it reads.
  return Math.round(accuracy * 100) >= Math.round(SUCCESS_THRESHOLD[gameType] * 100)
}

export function isFailedRecall(accuracy: number): boolean {
  return Math.round(accuracy * 100) < Math.round(RECALL_FAIL_BELOW * 100)
}

/** New score after a successful game. Assisted games stop at the Growing cap. */
export function addMastery(score: number, gameType: GameType): number {
  const raised = score + MASTERY_GAINS[gameType]
  if (gameType === 'recall') return clampMastery(raised)
  return clampMastery(Math.min(raised, Math.max(score, ASSISTED_MASTERY_CAP)))
}

export function reduceMastery(score: number): number {
  return clampMastery(score - FAILED_RECALL_PENALTY)
}

/** Status from score and recall history (spec §9.1, §9.4). */
export function masteryStatus(score: number, successfulRecallDays: number): Exclude<ScriptureStatus, 'new'> {
  if (score >= 80 && successfulRecallDays >= REQUIRED_RECALL_DAYS) return 'mastered'
  if (score >= 50) return 'strong'
  if (score >= 20) return 'growing'
  return 'learning'
}
